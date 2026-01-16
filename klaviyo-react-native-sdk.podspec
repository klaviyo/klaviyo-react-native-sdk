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
  s.dependency "KlaviyoSwift" "5.2.0"
  s.dependency "KlaviyoForms" "5.2.0"
  s.dependency "KlaviyoLocation" "5.2.0"

  s.default_subspecs = :none

end
