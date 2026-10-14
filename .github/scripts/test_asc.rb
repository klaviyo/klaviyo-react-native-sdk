# frozen_string_literal: true

# Unit tests for asc.rb. No network and no real key: a tiny WEBrick server
# stands in for App Store Connect (pointed at it via ASC_API_BASE), the
# Authorization header is ignored, and $LOADED_FEATURES is pre-seeded so the
# top-level `require 'jwt'` in asc.rb is skipped.

require 'minitest/autorun'
require 'socket'
require 'webrick'
require 'json'
require 'stringio'
require 'tempfile'
require 'tmpdir'

$LOADED_FEATURES << File.expand_path('jwt.rb', __dir__)

# In-memory App Store Connect stand-in. Each test sets @responses: a list of
# [method, path-regex, status, body-hash] rules matched in order.
class FakeAsc < WEBrick::HTTPServlet::AbstractServlet
  def do_GET(req, res) = handle(req, res)
  def do_POST(req, res) = handle(req, res)
  def do_PATCH(req, res) = handle(req, res)

  private

  def handle(req, res)
    srv = @options.first
    # WEBrick's req.path is the request URI (path + query) in this layout.
    full_path = req.request_uri.request_uri
    srv.requests << [req.request_method, full_path, req.body]
    rule = srv.responses.find { |m, pattern, _s, _b| m == req.request_method && full_path =~ pattern }
    if rule
      res.status = rule[2]
      res['Content-Type'] = 'application/json'
      res.body = JSON.generate(rule[3])
    else
      res.status = 500
      res.body = "no rule for #{req.request_method} #{req.path}"
    end
  end
end

class AscServer < WEBrick::HTTPServer
  attr_accessor :responses, :requests

  def initialize(port)
    super({ Port: port, BindAddress: '127.0.0.1', Logger: WEBrick::Log.new(File::NULL),
            AccessLog: [] })
    @responses = []
    @requests = []
    mount('/', FakeAsc, self)
  end
end

class TestAsc < Minitest::Test
  APP_ID = 'app-123'
  BUNDLE = 'com.example.app'

  def setup
    # Reserve an ephemeral port first, then hand it to WEBrick: binding it
    # directly to port 0 leaves @config[:Port] at 0, and the real port lives
    # only on the listener socket.
    probe = TCPServer.new('127.0.0.1', 0)
    @port = probe.addr[1]
    probe.close
    @server = AscServer.new(@port)
    @thread = Thread.new { @server.start }
    deadline = Time.now + 10
    sleep 0.05 until @server.status == :Running || Time.now > deadline
    raise 'test server failed to start' unless @server.status == :Running

    @env_file = Tempfile.new('github_env')
    @old_env = ENV.to_h
    ENV['ASC_API_BASE'] = "http://127.0.0.1:#{@port}/v1"
    ENV['APP_STORE_CONNECT_API_KEY_ID'] = 'KEYID'
    ENV['APP_STORE_CONNECT_API_KEY_ISSUER_ID'] = 'ISSUER'
    ENV['BUNDLE_ID'] = BUNDLE
    ENV['GITHUB_ENV'] = @env_file.path
    # ASC_TEST_TOKEN short-circuits token signing (no .p8 needed).
    ENV['ASC_TEST_TOKEN'] = 'test-token'
    ENV['HOME'] = Dir.mktmpdir

    load File.expand_path('asc.rb', __dir__)
  end

  def teardown
    ENV.replace(@old_env)
    @env_file.close!
    @server.shutdown
    @thread.join(10)
    # The listener closes asynchronously; wait until the port refuses
    # connections so macOS does not run out of ephemeral ports across tests.
    20.times do
      begin
        TCPSocket.new('127.0.0.1', @port).close
        sleep 0.05
      rescue SystemCallError
        break
      end
    end
  end

  def respond(method, pattern, body, status: 200)
    @server.responses << [method, pattern, status, body]
  end

  def app_response
    { 'data' => [{ 'id' => APP_ID, 'attributes' => { 'bundleId' => BUNDLE } }] }
  end

  def builds_page(versions, next_path = nil)
    { 'data' => versions.map { |v| { 'attributes' => { 'version' => v } } },
      'links' => (next_path ? { 'next' => "#{ENV['ASC_API_BASE']}#{next_path}" } : {}) }
  end

  def env_values
    Hash[@env_file.tap(&:rewind).read.lines.map { |l| l.chomp.split('=', 2) }]
  end

  def test_next_build_number_filters_by_marketing_version
    respond('GET', %r{/apps\?}, app_response)
    respond('GET', %r{/builds\?}, builds_page(%w[3 7 5]))

    out = capture_io { next_build_number('1.2.3', 1) }.first
    assert_equal 8, env_values['BUILD_NUMBER'].to_i
    assert_equal APP_ID, env_values['ASC_APP_ID']
    builds_req = @server.requests.find { |m, p, _| m == 'GET' && p.start_with?('/v1/builds') }
    assert_includes builds_req[1], 'filter[preReleaseVersion.version]=1.2.3'
    assert_includes out, 'Next build number: 8'
  end

  def test_next_build_number_first_build_of_new_version_is_one
    respond('GET', %r{/apps\?}, app_response)
    respond('GET', %r{/builds\?}, builds_page([]))

    capture_io { next_build_number('9.9.9', 1) }
    assert_equal 1, env_values['BUILD_NUMBER'].to_i
  end

  def test_next_build_number_minimum_is_a_floor
    respond('GET', %r{/apps\?}, app_response)
    respond('GET', %r{/builds\?}, builds_page(%w[2]))

    capture_io { next_build_number('1.0.0', 5) }
    assert_equal 5, env_values['BUILD_NUMBER'].to_i
  end

  def test_next_build_number_follows_pagination
    respond('GET', %r{/apps\?}, app_response)
    respond('GET', %r{/builds\?cursor=page2}, builds_page(%w[11 9]))
    respond('GET', %r{/builds\?}, builds_page(%w[4], '/builds?cursor=page2'))

    capture_io { next_build_number(nil, 1) }
    assert_equal 12, env_values['BUILD_NUMBER'].to_i
    assert_equal 2, @server.requests.count { |m, p, _| m == 'GET' && p.include?('builds?') }
  end

  def test_next_build_number_ignores_prefixed_bundle_ids
    respond('GET', %r{/apps\?},
            { 'data' => [{ 'id' => 'other', 'attributes' => { 'bundleId' => "#{BUNDLE}.extra" } },
                         { 'id' => APP_ID, 'attributes' => { 'bundleId' => BUNDLE } }] })
    respond('GET', %r{/builds\?}, builds_page(%w[1]))

    capture_io { next_build_number(nil, 1) }
    assert_equal APP_ID, env_values['ASC_APP_ID']
  end

  def test_next_build_number_fails_loudly_on_http_error
    respond('GET', %r{/apps\?}, { 'errors' => [{ 'status' => '401' }] }, status: 401)

    err = assert_raises(RuntimeError) { capture_io { next_build_number(nil, 1) } }
    assert_includes err.message, 'HTTP 401'
  end

  def test_set_whats_new_creates_localization
    respond('GET', %r{/apps\?}, app_response)
    respond('GET', %r{/builds\?.*version.=42},
            { 'data' => [{ 'id' => 'build-1', 'attributes' => { 'processingState' => 'VALID' } }] })
    respond('GET', %r{/builds/build-1/betaBuildLocalizations}, { 'data' => [] })
    respond('POST', %r{/betaBuildLocalizations}, { 'data' => { 'id' => 'loc-1' } })

    notes = Tempfile.new('notes')
    notes.write('What to test')
    notes.close

    capture_io { set_whats_new('1.2.3', '42', notes.path) }
    post = @server.requests.find { |m, p, _| m == 'POST' && p.include?('betaBuildLocalizations') }
    body = JSON.parse(post[2])
    assert_equal 'What to test', body.dig('data', 'attributes', 'whatsNew')
    assert_equal 'build-1', body.dig('data', 'relationships', 'build', 'data', 'id')
  end

  def test_set_whats_new_updates_existing_localization
    respond('GET', %r{/apps\?}, app_response)
    respond('GET', %r{/builds\?.*filter},
            { 'data' => [{ 'id' => 'build-1', 'attributes' => { 'processingState' => 'PROCESSING' } }] })
    respond('GET', %r{/builds/build-1/betaBuildLocalizations},
            { 'data' => [{ 'id' => 'loc-9', 'attributes' => { 'locale' => 'en-US' } }] })
    respond('PATCH', %r{/betaBuildLocalizations/loc-9}, { 'data' => { 'id' => 'loc-9' } })

    notes = Tempfile.new('notes')
    notes.write('updated notes')
    notes.close

    capture_io { set_whats_new('1.2.3', '42', notes.path) }
    patch = @server.requests.find { |m, _p, _| m == 'PATCH' }
    assert_equal 'updated notes', JSON.parse(patch[2]).dig('data', 'attributes', 'whatsNew')
  end

  def test_ios_marketing_version_plain_version_passes_through
    out, = capture_io { assert_equal '2.5.1', ios_marketing_version('2.5.1') }
    assert_equal "2.5.1\n", out
  end

  def test_ios_marketing_version_strips_prerelease_suffix
    out, = capture_io { assert_equal '2.6.0', ios_marketing_version('2.6.0-alpha.1') }
    assert_equal "2.6.0\n", out
  end

  def test_ios_marketing_version_strips_suffix_and_build_metadata
    out, = capture_io { assert_equal '2.6.0', ios_marketing_version('2.6.0-rc.1+meta') }
    assert_equal "2.6.0\n", out
  end

  def test_ios_marketing_version_accepts_one_and_two_part_versions
    capture_io do
      assert_equal '2', ios_marketing_version('2')
      assert_equal '2.6', ios_marketing_version('2.6-beta')
    end
  end

  def test_ios_marketing_version_rejects_malformed_versions
    %w[v2 abc 1.2.3.4].each do |bad|
      assert_raises(SystemExit) { capture_io { ios_marketing_version(bad) } }
    end
    assert_raises(SystemExit) { capture_io { ios_marketing_version('') } }
  end

  # bump-version.sh re-implements the same strip in bash; these pin the
  # shared contract both implementations follow.
  def test_strip_ios_marketing_version_shared_contract
    {
      '2.5.1' => '2.5.1',
      '2.6.0-alpha.1' => '2.6.0',
      '2.6.0-rc.1+meta' => '2.6.0',
      '2.6-beta' => '2.6',
      '2' => '2',
      'v2' => 'v2',
      'abc' => 'abc',
      '1.2.3.4' => '1.2.3.4',
      '' => ''
    }.each do |input, expected|
      assert_equal expected, strip_ios_marketing_version(input)
    end
  end

  def test_valid_ios_marketing_version_shared_contract
    %w[2 2.6 2.6.0].each { |v| assert valid_ios_marketing_version?(v), v }
    ['v2', 'abc', '1.2.3.4', '', '2.6.0-rc.1', '2.6.0+meta'].each { |v| refute valid_ios_marketing_version?(v), v }
  end
end
