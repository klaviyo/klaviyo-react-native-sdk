# frozen_string_literal: true

# App Store Connect API helper for the example app's TestFlight publish.
#
# Usage:
#   ruby asc.rb next-build-number
#       Writes BUILD_NUMBER (latest uploaded CFBundleVersion + 1) and
#       ASC_APP_ID to $GITHUB_ENV.
#   ruby asc.rb set-whats-new <marketing-version> <build-number> <notes-file>
#       Waits for the uploaded build to appear in App Store Connect, then sets
#       its en-US TestFlight "What to Test" text (betaBuildLocalizations).
#       Writes ASC_BUILD_ID to $GITHUB_ENV.
#
# Env: APP_STORE_CONNECT_API_KEY_ID, APP_STORE_CONNECT_API_KEY_ISSUER_ID,
# BUNDLE_ID. The .p8 key is read from ~/.appstoreconnect/private_keys.
# Requires the `jwt` gem.

require 'jwt'
require 'json'
require 'net/http'
require 'openssl'
require 'uri'

API = 'https://api.appstoreconnect.apple.com/v1'
LOCALE = 'en-US'

def token
  # Regenerate per request: set-whats-new can poll for longer than a token's
  # 20-minute max lifetime.
  key_id = ENV.fetch('APP_STORE_CONNECT_API_KEY_ID')
  p8_path = File.expand_path("~/.appstoreconnect/private_keys/AuthKey_#{key_id}.p8")
  @private_key ||= OpenSSL::PKey::EC.new(File.read(p8_path))
  now = Time.now.to_i
  JWT.encode(
    { iss: ENV.fetch('APP_STORE_CONNECT_API_KEY_ISSUER_ID'), iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' },
    @private_key,
    'ES256',
    { kid: key_id }
  )
end

def request(method, path, body = nil)
  uri = URI("#{API}#{path}")
  req = Net::HTTP.const_get(method).new(uri, 'Authorization' => "Bearer #{token}", 'Content-Type' => 'application/json')
  req.body = JSON.generate(body) if body
  res = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |h| h.request(req) }
  raise "ASC API #{method.upcase} #{path}: HTTP #{res.code}\n#{res.body}" unless res.is_a?(Net::HTTPSuccess)

  res.body.to_s.empty? ? {} : JSON.parse(res.body)
end

def write_env(name, value)
  File.open(ENV.fetch('GITHUB_ENV'), 'a') { |f| f.puts "#{name}=#{value}" }
end

def app_id
  bundle_id = ENV.fetch('BUNDLE_ID')
  apps = request(:Get, "/apps?filter[bundleId]=#{bundle_id}&limit=1")
  raise "No app record in App Store Connect for bundleId=#{bundle_id}. Create the app listing first." if apps['data'].empty?

  apps['data'][0]['id']
end

def next_build_number
  id = app_id
  # Fetch all builds and take the numeric max — `uploadedDate` can be null.
  # limit=200 is the API max; pagination needed past that.
  builds = request(:Get, "/builds?filter[app]=#{id}&limit=200")
  versions = builds['data'].map { |b| b['attributes']['version'].to_i }
  latest = versions.max || 0

  puts "Latest TestFlight build for #{ENV.fetch('BUNDLE_ID')}: #{latest}"
  puts "Next build number: #{latest + 1}"
  write_env('BUILD_NUMBER', latest + 1)
  write_env('ASC_APP_ID', id)
end

def set_whats_new(marketing_version, build_number, notes_file)
  id = app_id
  notes = File.read(notes_file)

  # A build shows up in the API a few minutes after altool returns, well
  # before processing finishes. Localizations can be set while processing.
  build = nil
  deadline = Time.now + (20 * 60)
  query = "/builds?filter[app]=#{id}&filter[version]=#{build_number}" \
          "&filter[preReleaseVersion.version]=#{marketing_version}&limit=1"
  loop do
    build = request(:Get, query)['data'].first
    break if build
    raise "Build #{marketing_version} (#{build_number}) did not appear in App Store Connect within 20 minutes" if Time.now > deadline

    puts "Waiting for build #{marketing_version} (#{build_number}) to appear in App Store Connect..."
    sleep 30
  end
  build_id = build['id']
  write_env('ASC_BUILD_ID', build_id)

  existing = request(:Get, "/builds/#{build_id}/betaBuildLocalizations")['data']
               .find { |l| l['attributes']['locale'] == LOCALE }
  if existing
    request(:Patch, "/betaBuildLocalizations/#{existing['id']}", {
              data: { type: 'betaBuildLocalizations', id: existing['id'], attributes: { whatsNew: notes } }
            })
  else
    request(:Post, '/betaBuildLocalizations', {
              data: {
                type: 'betaBuildLocalizations',
                attributes: { locale: LOCALE, whatsNew: notes },
                relationships: { build: { data: { type: 'builds', id: build_id } } }
              }
            })
  end
  puts "Set TestFlight \"What to Test\" (#{LOCALE}) for build #{marketing_version} (#{build_number})"
end

case ARGV[0]
when 'next-build-number'
  next_build_number
when 'set-whats-new'
  abort 'usage: asc.rb set-whats-new <marketing-version> <build-number> <notes-file>' unless ARGV.length == 4
  set_whats_new(ARGV[1], ARGV[2], ARGV[3])
else
  abort 'usage: asc.rb {next-build-number|set-whats-new ...}'
end
