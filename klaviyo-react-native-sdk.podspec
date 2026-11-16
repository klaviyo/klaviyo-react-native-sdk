require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = package["name"]
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "13.0" }
  s.source       = { :git => "https://github.com/klaviyo/klaviyo-react-native-sdk.git", :tag => "#{s.version}" }
  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.resources    = ["ios/klaviyo-sdk-configuration.plist"]

  s.pod_target_xcconfig = { "DEFINES_MODULE" => "YES" }

  s.dependency "React-Core"
  s.dependency "KlaviyoSwift" ##, "5.6.0"
  # Optional location and forms; included by default, set to 'false' to exclude
  if ENV['KLAVIYO_INCLUDE_LOCATION'] != 'false'
    s.dependency "KlaviyoLocation" ##, "5.6.0"
  end
  if ENV['KLAVIYO_INCLUDE_FORMS'] != 'false'
    s.dependency "KlaviyoForms" ##, "5.6.0"
  end
  # Optional Mobile Inbox. Opt-in, unlike the two above: set KLAVIYO_INCLUDE_INBOX=true to include
  # it. Off by default because the native Inbox product this depends on is not released yet, so a
  # default `pod install` cannot resolve it. The bridge guards every inbox call with
  # `#if canImport(KlaviyoInbox)` and reports INBOX_UNAVAILABLE when the pod is absent.
  #
  # `./configure-sdk.sh --ios=<branch|commit|path> --inbox` enables it and points the pod at an
  # unreleased klaviyo-swift-sdk ref, via the example app's Podfile.
  if ENV['KLAVIYO_INCLUDE_INBOX'] == 'true'
    s.dependency "KlaviyoInbox"
  end

  s.default_subspecs = :none

end
