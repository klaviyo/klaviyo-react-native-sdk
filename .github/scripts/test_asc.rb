# frozen_string_literal: true

# Unit tests for asc.rb. No network and no real key: a tiny WEBrick server
# stands in for App Store Connect (pointed at it via ASC_API_BASE), the
# Authorization header is ignored, and $LOADED_FEATURES is pre-seeded so the
# top-level `require 'jwt'` in asc.rb is skipped.

require 'minitest/autorun'
require 'socket'
require 'webrick'
require 'json'
require 'uri'
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
    if rule && rule[2] == :stall
      sleep rule[3]
      res.status = 200
      res.body = '{}'
    elsif rule && rule[2] == :filtering
      res.status = 200
      res['Content-Type'] = 'application/json'
      res.body = JSON.generate(filtered_builds(rule[3], full_path))
    elsif rule
      res.status = rule[2]
      res['Content-Type'] = 'application/json'
      res.body = JSON.generate(rule[3])
    else
      res.status = 500
      res.body = "no rule for #{req.request_method} #{req.path}"
    end
  end
end

# Applies the query's filters to build records, as App Store Connect would.
# Each record: { id:, version:, marketing:, state: }.
def filtered_builds(records, full_path)
  query = URI.decode_www_form(URI(full_path).query.to_s).to_h
  limit = (query['limit'] || '200').to_i
  matched = records.select do |r|
    (query['filter[version]'].nil? || r[:version] == query['filter[version]']) &&
      (query['filter[preReleaseVersion.version]'].nil? ||
       r[:marketing] == query['filter[preReleaseVersion.version]'])
  end
  { 'data' => matched.first(limit).map do |r|
      { 'id' => r[:id],
        'attributes' => { 'version' => r[:version], 'processingState' => r[:state] || 'VALID' } }
    end,
    'links' => {} }
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
    # A lookup that finds no build must fail within a second, not poll for
    # the 45 minutes a real deploy waits.
    ENV['ASC_POLL_TIMEOUT'] = '1'
    ENV['ASC_POLL_INTERVAL'] = '0.2'
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

  # Stateful /builds stand-in: applies filter[version] and
  # filter[preReleaseVersion.version] to BUILD_RECORDS (in listed order) and
  # honours limit, like App Store Connect does.
  def respond_with_filtering_builds(records)
    @server.responses << ['GET', %r{/builds\?}, :filtering, records]
  end

  def builds_page(versions, next_path = nil)
    { 'data' => versions.map { |v| { 'attributes' => { 'version' => v } } },
      'links' => (next_path ? { 'next' => "#{ENV['ASC_API_BASE']}#{next_path}" } : {}) }
  end

  def env_values
    Hash[@env_file.tap(&:rewind).read.lines.map { |l| l.chomp.split('=', 2) }]
  end

  def test_a_stalled_api_call_times_out_instead_of_hanging
    ENV['ASC_HTTP_TIMEOUT'] = '1'
    @server.responses << ['GET', %r{/apps\?}, :stall, 5]

    started = Time.now
    assert_raises(Net::ReadTimeout) { next_build_number('1.2.3', 1) }
    assert_operator Time.now - started, :<, 4
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

    capture_io { next_build_number('1.2.3', 1) }
    assert_equal 12, env_values['BUILD_NUMBER'].to_i
    assert_equal 2, @server.requests.count { |m, p, _| m == 'GET' && p.include?('builds?') }
  end

  def test_next_build_number_ignores_prefixed_bundle_ids
    respond('GET', %r{/apps\?},
            { 'data' => [{ 'id' => 'other', 'attributes' => { 'bundleId' => "#{BUNDLE}.extra" } },
                         { 'id' => APP_ID, 'attributes' => { 'bundleId' => BUNDLE } }] })
    respond('GET', %r{/builds\?}, builds_page(%w[1]))

    capture_io { next_build_number('1.2.3', 1) }
    assert_equal APP_ID, env_values['ASC_APP_ID']
  end

  def test_next_build_number_fails_loudly_on_http_error
    respond('GET', %r{/apps\?}, { 'errors' => [{ 'status' => '401' }] }, status: 401)

    err = assert_raises(RuntimeError) { capture_io { next_build_number('1.2.3', 1) } }
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

  # Build 7 of 0.3.1 and build 7 of 0.3.2 can coexist because build numbers
  # restart per marketing version. The older build is listed first, so a lookup
  # that filters by build number alone (limit=1) would pick it.
  SHARED_NUMBER_BUILDS = [
    { id: 'old-0.3.1-b7', version: '7', marketing: '0.3.1' },
    { id: 'new-0.3.2-b7', version: '7', marketing: '0.3.2' }
  ].freeze

  def test_set_whats_new_targets_the_marketing_version_when_build_numbers_collide
    respond('GET', %r{/apps\?}, app_response)
    respond_with_filtering_builds(SHARED_NUMBER_BUILDS)
    respond('GET', %r{/builds/[^/]+/betaBuildLocalizations}, { 'data' => [] })
    respond('POST', %r{/betaBuildLocalizations}, { 'data' => { 'id' => 'loc-1' } })

    notes = Tempfile.new('notes')
    notes.write('notes for 0.3.2')
    notes.close

    capture_io { set_whats_new('0.3.2', '7', notes.path) }
    post = @server.requests.find { |m, p, _| m == 'POST' && p.include?('betaBuildLocalizations') }
    refute_nil post, 'no localization was written'
    body = JSON.parse(post[2])
    assert_equal 'new-0.3.2-b7', body.dig('data', 'relationships', 'build', 'data', 'id')
    refute(@server.requests.any? { |_m, p, _| p.include?('old-0.3.1-b7') },
           'the older build with the same number was touched')
  end

  def test_set_whats_new_targets_the_older_version_when_that_is_requested
    respond('GET', %r{/apps\?}, app_response)
    respond_with_filtering_builds(SHARED_NUMBER_BUILDS.reverse)
    respond('GET', %r{/builds/[^/]+/betaBuildLocalizations}, { 'data' => [] })
    respond('POST', %r{/betaBuildLocalizations}, { 'data' => { 'id' => 'loc-1' } })

    notes = Tempfile.new('notes')
    notes.write('notes for 0.3.1')
    notes.close

    capture_io { set_whats_new('0.3.1', '7', notes.path) }
    post = @server.requests.find { |m, p, _| m == 'POST' && p.include?('betaBuildLocalizations') }
    body = JSON.parse(post[2])
    assert_equal 'old-0.3.1-b7', body.dig('data', 'relationships', 'build', 'data', 'id')
  end

  def test_set_whats_new_lookup_sends_app_marketing_version_and_build_filters
    respond('GET', %r{/apps\?}, app_response)
    respond_with_filtering_builds(SHARED_NUMBER_BUILDS)
    respond('GET', %r{/builds/[^/]+/betaBuildLocalizations}, { 'data' => [] })
    respond('POST', %r{/betaBuildLocalizations}, { 'data' => { 'id' => 'loc-1' } })

    notes = Tempfile.new('notes')
    notes.write('n')
    notes.close
    capture_io { set_whats_new('0.3.2', '7', notes.path) }

    lookup = @server.requests.find { |m, p, _| m == 'GET' && p.start_with?('/v1/builds?') || (m == 'GET' && p.include?('/builds?')) }
    query = URI.decode_www_form(URI(lookup[1]).query).to_h
    assert_equal APP_ID, query['filter[app]']
    assert_equal '7', query['filter[version]']
    assert_equal '0.3.2', query['filter[preReleaseVersion.version]']
  end

  def test_next_build_number_ignores_a_higher_number_from_another_marketing_version
    respond('GET', %r{/apps\?}, app_response)
    respond_with_filtering_builds([
      { id: 'a', version: '12', marketing: '0.3.1' },
      { id: 'b', version: '7', marketing: '0.3.2' }
    ])
    out, = capture_io { next_build_number('0.3.2', 1) }
    assert_equal '8', env_values['BUILD_NUMBER'], out
  end

  def test_next_build_number_cli_requires_a_marketing_version
    respond('GET', %r{/apps\?}, app_response)
    respond_with_filtering_builds(SHARED_NUMBER_BUILDS)
    err = assert_raises(SystemExit) { capture_io { main(['next-build-number']) } }
    refute_equal 0, err.status
    assert_empty(@server.requests, 'a query was sent without a marketing version')
  end

  def test_next_build_number_cli_rejects_an_empty_marketing_version
    respond('GET', %r{/apps\?}, app_response)
    err = assert_raises(SystemExit) { capture_io { main(['next-build-number', '--marketing-version', '']) } }
    refute_equal 0, err.status
  end

  # Registers every route a lookup could reach, so an error in a rejection
  # test can only come from the validation itself (never from a missing route),
  # and the request log proves no call was sent.
  def stub_all_asc_routes
    respond('GET', %r{/apps\?}, app_response)
    respond_with_filtering_builds([{ id: 'b', version: '1', marketing: '2.6.0' }])
    respond('GET', %r{/builds/[^/]+/betaBuildLocalizations}, { 'data' => [] })
    respond('POST', %r{/betaBuildLocalizations}, { 'data' => { 'id' => 'loc-1' } })
  end

  def assert_rejected_without_a_request(bad, &call)
    err = assert_raises(ArgumentError, "#{bad.inspect} was not rejected") { capture_io(&call) }
    assert_includes err.message, 'numeric marketing version', "wrong cause for #{bad.inspect}: #{err.message}"
    assert_empty(@server.requests, "a request was sent for #{bad.inspect}: #{@server.requests.inspect}")
  end

  def test_lookups_reject_an_empty_or_nil_marketing_version
    stub_all_asc_routes
    notes = Tempfile.new('notes')
    notes.write('n')
    notes.close
    [nil, '', '  '].each do |bad|
      assert_rejected_without_a_request(bad) { next_build_number(bad, 1) }
      assert_rejected_without_a_request(bad) { build_versions(APP_ID, bad) }
      assert_rejected_without_a_request(bad) { set_whats_new(bad, '7', notes.path) }
    end
  end

  def test_lookups_reject_a_malformed_marketing_version
    stub_all_asc_routes
    %w[abc v2 1.2.3.4 -rc.1].each do |bad|
      assert_rejected_without_a_request(bad) { next_build_number(bad, 1) }
    end
  end

  def test_build_versions_sends_the_marketing_version_filter_unconditionally
    respond('GET', %r{/builds\?}, builds_page(%w[3]))
    build_versions(APP_ID, '2.6.0')
    query = URI.decode_www_form(URI(@server.requests.last[1]).query).to_h
    assert_equal '2.6.0', query['filter[preReleaseVersion.version]']
    assert_equal APP_ID, query['filter[app]']
  end

  # ASC stores preReleaseVersion.version as 2.6.0, never 2.6.0-rc.1, so a
  # lookup that forwarded the suffix would find nothing and the notes job
  # would poll until it timed out.
  def test_next_build_number_sends_the_stripped_version_for_a_prerelease
    stub_all_asc_routes
    @server.responses.reject! { |_m, pattern, _s, _b| pattern == %r{/builds\?} }
    respond_with_filtering_builds([{ id: 'a', version: '4', marketing: '2.6.0' }])
    capture_io { next_build_number('2.6.0-rc.1', 1) }
    lookup = @server.requests.find { |m, p, _| m == 'GET' && p.include?('/builds?') }
    refute_nil lookup, 'no builds lookup was sent'
    assert_equal '2.6.0', URI.decode_www_form(URI(lookup[1]).query).to_h['filter[preReleaseVersion.version]'],
                 'the prerelease suffix was forwarded to App Store Connect'
    assert_equal '5', env_values['BUILD_NUMBER']
  end

  def test_set_whats_new_sends_the_stripped_version_for_a_prerelease
    stub_all_asc_routes
    @server.responses.reject! { |_m, pattern, _s, _b| pattern == %r{/builds\?} }
    respond_with_filtering_builds([{ id: 'rc-build', version: '7', marketing: '2.6.0' }])
    notes = Tempfile.new('notes')
    notes.write('n')
    notes.close

    capture_io { set_whats_new('2.6.0-rc.1+meta', '7', notes.path) }
    lookup = @server.requests.find { |m, p, _| m == 'GET' && p.include?('/builds?') }
    refute_nil lookup, 'no builds lookup was sent'
    assert_equal '2.6.0', URI.decode_www_form(URI(lookup[1]).query).to_h['filter[preReleaseVersion.version]'],
                 'the prerelease suffix was forwarded to App Store Connect'
    post = @server.requests.find { |m, p, _| m == 'POST' && p.include?('betaBuildLocalizations') }
    refute_nil post, 'no notes were written'
    assert_equal 'rc-build', JSON.parse(post[2]).dig('data', 'relationships', 'build', 'data', 'id')
  end

  def test_set_whats_new_requires_a_build_number
    stub_all_asc_routes
    notes = Tempfile.new('notes')
    notes.write('n')
    notes.close
    err = assert_raises(ArgumentError) { capture_io { set_whats_new('2.6.0', '', notes.path) } }
    assert_includes err.message, 'build number is required'
    assert_empty(@server.requests, 'a request was sent without a build number')
  end

  def test_cli_aborts_cleanly_on_a_malformed_marketing_version
    stub_all_asc_routes
    status = nil
    _out, err_output = capture_io do
      begin
        main(['next-build-number', '--marketing-version', 'abc'])
      rescue SystemExit => e
        status = e.status
      end
    end
    refute_nil status, 'the CLI did not abort'
    refute_equal 0, status
    assert_includes err_output, 'numeric marketing version', "wrong cause: #{err_output}"
    assert_empty(@server.requests, 'a request was sent for a malformed version')
  end

  def test_set_whats_new_fails_fast_and_names_the_build_when_none_appears
    stub_all_asc_routes
    @server.responses.reject! { |_m, pattern, _s, _b| pattern == %r{/builds\?} }
    respond_with_filtering_builds([{ id: 'other', version: '7', marketing: '9.9.9' }])
    notes = Tempfile.new('notes')
    notes.write('n')
    notes.close

    started = Time.now
    err = assert_raises(RuntimeError) { capture_io { set_whats_new('2.6.0', '7', notes.path) } }
    assert_operator Time.now - started, :<, 10, 'the poll did not honour ASC_POLL_TIMEOUT'
    assert_includes err.message, '2.6.0'
    assert_includes err.message, '(7)'
    assert_includes err.message, 'did not appear'
    refute(@server.requests.any? { |m, _p, _| m == 'POST' || m == 'PATCH' }, 'notes were written to a build')
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
