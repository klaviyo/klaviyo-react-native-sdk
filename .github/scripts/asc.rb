# frozen_string_literal: true

# App Store Connect API helper for the example app's TestFlight publish.
#
# Usage:
#   ruby asc.rb next-build-number [--marketing-version <v>] [--minimum <n>]
#       Prints the next CFBundleVersion to use. With --marketing-version only
#       builds of that version are considered (first build of a new version
#       is 1); --minimum is a floor the result never goes below. Writes
#       BUILD_NUMBER and ASC_APP_ID to $GITHUB_ENV when it is set. Exits
#       non-zero when the query fails.
#   ruby asc.rb set-whats-new <marketing-version> <build-number> <notes-file>
#       Waits for the uploaded build to finish processing in App Store
#       Connect, then sets its en-US TestFlight "What to Test" text
#       (betaBuildLocalizations).
#
# Env: APP_STORE_CONNECT_API_KEY_ID, APP_STORE_CONNECT_API_KEY_ISSUER_ID,
# BUNDLE_ID. The .p8 key is read from ~/.appstoreconnect/private_keys.
# Requires the `jwt` gem. ASC_API_BASE overrides the API root (tests only).

require 'jwt'
require 'json'
require 'net/http'
require 'openssl'
require 'uri'
require 'time'

LOCALE = 'en-US'
# Apple caps token lifetime at 20 minutes; regenerate well inside that and
# again whenever a previous token was minted more than 15 minutes ago, since
# set-whats-new can poll for far longer than one token lives.
TOKEN_LIFETIME = 15 * 60

def token
  return ENV['ASC_TEST_TOKEN'] if ENV['ASC_TEST_TOKEN']

  key_id = ENV.fetch('APP_STORE_CONNECT_API_KEY_ID')
  p8_path = File.expand_path("~/.appstoreconnect/private_keys/AuthKey_#{key_id}.p8")
  @private_key ||= OpenSSL::PKey::EC.new(File.read(p8_path))
  now = Time.now.to_i
  if @token.nil? || now > @token_issued_at + TOKEN_LIFETIME
    @token = JWT.encode(
      { iss: ENV.fetch('APP_STORE_CONNECT_API_KEY_ISSUER_ID'), iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' },
      @private_key,
      'ES256',
      { kid: key_id }
    )
    @token_issued_at = now
  end
  @token
end

def api_base
  ENV['ASC_API_BASE'] || 'https://api.appstoreconnect.apple.com/v1'
end

def request(method, path, body = nil)
  path = path.sub('?', '&') if URI(api_base).query && path.include?('?')
  uri = URI("#{api_base}#{path}")
  req = Net::HTTP.const_get(method).new(uri, 'Authorization' => "Bearer #{token}", 'Content-Type' => 'application/json')
  req.body = JSON.generate(body) if body
  res = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == 'https') { |h| h.request(req) }
  raise "ASC API #{method.upcase} #{path}: HTTP #{res.code}\n#{res.body}" unless res.is_a?(Net::HTTPSuccess)

  res.body.to_s.empty? ? {} : JSON.parse(res.body)
end

def write_env(name, value)
  return unless ENV['GITHUB_ENV']

  File.open(ENV.fetch('GITHUB_ENV'), 'a') { |f| f.puts "#{name}=#{value}" }
end

def app_id
  bundle_id = ENV.fetch('BUNDLE_ID')
  # filter[bundleId] prefix-matches, so confirm the exact bundle ID.
  apps = request(:Get, "/apps?filter[bundleId]=#{bundle_id}&limit=10")
  app = apps['data'].find { |a| a.dig('attributes', 'bundleId') == bundle_id }
  raise "No app record in App Store Connect for bundleId=#{bundle_id}. Create the app listing first." unless app

  app['id']
end

# All build versions for the app (filtered to the marketing version when
# given). limit=200 is the API max; follow links.next past that.
def build_versions(id, marketing_version)
  versions = []
  path = "/builds?filter[app]=#{id}&limit=200&fields[builds]=version,uploadedDate"
  path += "&filter[preReleaseVersion.version]=#{marketing_version}" if marketing_version
  while path
    page = request(:Get, path)
    versions.concat(page['data'].map { |b| b.dig('attributes', 'version') })
    nxt = page.dig('links', 'next')
    path = nxt ? nxt.sub(api_base, '') : nil
  end
  versions
end

def next_build_number(marketing_version, minimum)
  id = app_id
  latest = build_versions(id, marketing_version).map(&:to_i).max || 0
  nxt = [latest + 1, minimum].max

  scope = marketing_version ? "version #{marketing_version}" : 'any version'
  puts "Latest TestFlight build for #{ENV.fetch('BUNDLE_ID')} (#{scope}): #{latest}"
  puts "Next build number: #{nxt}"
  write_env('BUILD_NUMBER', nxt)
  write_env('ASC_APP_ID', id)
  nxt
end

def set_whats_new(marketing_version, build_number, notes_file)
  id = app_id
  notes = File.read(notes_file)

  # Localizations can be set while the build is still PROCESSING, but some
  # App Store Connect states reject it, so poll for a terminal-good state.
  build = nil
  state = nil
  deadline = Time.now + (45 * 60)
  query = "/builds?filter[app]=#{id}&filter[version]=#{build_number}" \
          "&filter[preReleaseVersion.version]=#{marketing_version}&limit=1"
  loop do
    build = request(:Get, query)['data'].first
    state = build&.dig('attributes', 'processingState')
    puts "Build #{marketing_version} (#{build_number}): #{state || 'not visible yet'}"
    break if build && %w[VALID PROCESSING].include?(state)
    raise "Build #{marketing_version} (#{build_number}) ended in state #{state}" if %w[FAILED INVALID].include?(state)
    raise "Build #{marketing_version} (#{build_number}) did not appear within 45 minutes" if Time.now > deadline

    sleep 30
  end
  build_id = build['id']

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

def main(argv)
  case argv[0]
  when 'next-build-number'
    marketing_version = nil
    minimum = 1
    args = argv[1..]
    until args.empty?
      case args.shift
      when '--marketing-version' then marketing_version = args.shift
      when '--minimum' then minimum = Integer(args.shift)
      else abort "asc.rb next-build-number: unknown argument"
      end
    end
    next_build_number(marketing_version, minimum)
  when 'set-whats-new'
    abort 'usage: asc.rb set-whats-new <marketing-version> <build-number> <notes-file>' unless argv.length == 4

    set_whats_new(argv[1], argv[2], argv[3])
  else
    abort 'usage: asc.rb {next-build-number [--marketing-version v] [--minimum n]|set-whats-new ...}'
  end
end

main(ARGV) if __FILE__ == $PROGRAM_NAME
