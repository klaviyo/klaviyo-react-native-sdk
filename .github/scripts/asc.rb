# frozen_string_literal: true

# App Store Connect API helper for the example app's TestFlight publish.
#
# Usage:
#   ruby asc.rb next-build-number --marketing-version <v> [--minimum <n>]
#       Prints the next CFBundleVersion to use. Only builds of that marketing
#       version are considered (the first build of a new version is 1), so
#       --marketing-version is required; --minimum is a floor the result never
#       goes below. Writes
#       BUILD_NUMBER and ASC_APP_ID to $GITHUB_ENV when it is set. Exits
#       non-zero when the query fails or --marketing-version is missing.
#   ruby asc.rb set-whats-new <marketing-version> <build-number> <notes-file>
#       Waits for the uploaded build to finish processing in App Store
#       Connect, then sets its en-US TestFlight "What to Test" text
#       (betaBuildLocalizations). The marketing version is stripped of any
#       -suffix before the lookup (ASC holds 5.5.0, not 5.5.0-beta.1).
#   ruby asc.rb ios-marketing-version <full-version>
#       Prints the CFBundleShortVersionString-safe form of a package.json
#       version: prerelease suffix and build metadata stripped. Aborts
#       non-zero unless the result is numeric X.Y[.Z], e.g. 2.6.0-rc.1
#       prints 2.6.0; `v2` or `1.2.3.4` abort. Pure string handling, no API
#       calls.
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

# Apple requires CFBundleShortVersionString to be numeric X.Y[.Z], so a
# semver prerelease wrapper (2.6.0-rc.1) must be stripped before it reaches
# the pbxproj or an ASC version filter. Build numbers key on the stripped
# value, so a prerelease shares the release version's build sequence.
def strip_ios_marketing_version(full_version)
  full_version.to_s.strip.sub(/[-+].*\z/, '')
end

def valid_ios_marketing_version?(version)
  version.match?(/\A\d+(\.\d+){0,2}\z/)
end

def ios_marketing_version(full_version)
  stripped = strip_ios_marketing_version(full_version)
  unless valid_ios_marketing_version?(stripped)
    abort "asc.rb ios-marketing-version: '#{full_version}' does not strip to a numeric X.Y[.Z] version (got '#{stripped}')"
  end

  puts stripped
  stripped
end

# The marketing version every ASC build lookup filters on. ASC stores
# preReleaseVersion.version as the numeric X.Y.Z (5.5.0, never 5.5.0-beta.1),
# so a suffix is stripped here and an empty or malformed value is an error:
# a lookup without the filter, or with a suffix it cannot match, would return
# the wrong build or nothing at all.
def lookup_marketing_version(raw)
  stripped = strip_ios_marketing_version(raw)
  if stripped.empty? || !valid_ios_marketing_version?(stripped)
    raise ArgumentError, "an ASC build lookup needs a numeric marketing version (got #{raw.inspect})"
  end

  stripped
end

def app_id
  bundle_id = ENV.fetch('BUNDLE_ID')
  # filter[bundleId] prefix-matches, so confirm the exact bundle ID.
  apps = request(:Get, "/apps?filter[bundleId]=#{bundle_id}&limit=10")
  app = apps['data'].find { |a| a.dig('attributes', 'bundleId') == bundle_id }
  raise "No app record in App Store Connect for bundleId=#{bundle_id}. Create the app listing first." unless app

  app['id']
end

# All build versions of one marketing version of the app. The marketing-version
# filter is unconditional. limit=200 is the API max; follow links.next past that.
def build_versions(id, marketing_version)
  marketing_version = lookup_marketing_version(marketing_version)
  versions = []
  path = "/builds?filter[app]=#{id}&filter[preReleaseVersion.version]=#{marketing_version}" \
         '&limit=200&fields[builds]=version,uploadedDate'
  while path
    page = request(:Get, path)
    versions.concat(page['data'].map { |b| b.dig('attributes', 'version') })
    nxt = page.dig('links', 'next')
    path = nxt ? nxt.sub(api_base, '') : nil
  end
  versions
end

def next_build_number(marketing_version, minimum)
  marketing_version = lookup_marketing_version(marketing_version)
  id = app_id
  latest = build_versions(id, marketing_version).map(&:to_i).max || 0
  nxt = [latest + 1, minimum].max

  puts "Latest TestFlight build for #{ENV.fetch('BUNDLE_ID')} (version #{marketing_version}): #{latest}"
  puts "Next build number: #{nxt}"
  write_env('BUILD_NUMBER', nxt)
  write_env('ASC_APP_ID', id)
  nxt
end

# How long and how often set_whats_new waits for a fresh upload to appear in
# App Store Connect. ASC_POLL_TIMEOUT / ASC_POLL_INTERVAL (seconds) override
# the defaults so tests fail fast instead of waiting out a real deploy's poll.
def poll_timeout
  Float(ENV.fetch('ASC_POLL_TIMEOUT', 45 * 60))
end

def poll_interval
  Float(ENV.fetch('ASC_POLL_INTERVAL', 30))
end

def set_whats_new(marketing_version, build_number, notes_file)
  marketing_version = lookup_marketing_version(marketing_version)
  raise ArgumentError, "a build number is required (got #{build_number.inspect})" if build_number.to_s.strip.empty?

  id = app_id
  notes = File.read(notes_file)

  # Localizations can be set while the build is still PROCESSING, but some
  # App Store Connect states reject it, so poll for a terminal-good state.
  build = nil
  state = nil
  deadline = Time.now + poll_timeout
  query = "/builds?filter[app]=#{id}&filter[version]=#{build_number}" \
          "&filter[preReleaseVersion.version]=#{marketing_version}&limit=1"
  loop do
    build = request(:Get, query)['data'].first
    state = build&.dig('attributes', 'processingState')
    puts "Build #{marketing_version} (#{build_number}): #{state || 'not visible yet'}"
    break if build && %w[VALID PROCESSING].include?(state)
    raise "Build #{marketing_version} (#{build_number}) ended in state #{state}" if %w[FAILED INVALID].include?(state)
    raise "Build #{marketing_version} (#{build_number}) did not appear within #{(poll_timeout / 60.0).round} minutes" if Time.now > deadline

    sleep poll_interval
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
    abort 'asc.rb next-build-number: --marketing-version is required' if marketing_version.nil? || marketing_version.empty?

    begin
      next_build_number(marketing_version, minimum)
    rescue ArgumentError => e
      abort "asc.rb next-build-number: #{e.message}"
    end
  when 'set-whats-new'
    abort 'usage: asc.rb set-whats-new <marketing-version> <build-number> <notes-file>' unless argv.length == 4

    begin
      set_whats_new(argv[1], argv[2], argv[3])
    rescue ArgumentError => e
      abort "asc.rb set-whats-new: #{e.message}"
    end
  when 'ios-marketing-version'
    abort 'usage: asc.rb ios-marketing-version <full-version>' unless argv.length == 2

    ios_marketing_version(argv[1])
  else
    abort 'usage: asc.rb {next-build-number [--marketing-version v] [--minimum n]|set-whats-new ...|ios-marketing-version <v>}'
  end
end

main(ARGV) if __FILE__ == $PROGRAM_NAME
