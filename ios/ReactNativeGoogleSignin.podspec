require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name                = 'ReactNativeGoogleSignin'
  s.version             = package['version']
  s.summary             = package['description']
  s.description         = package['description']
  s.homepage            = 'https://github.com/devfd/react-native-google-signin'
  s.license             = package['license']
  s.author              = package['author']
  s.source              = { :git => 'https://github.com/devfd/react-native-google-signin.git', :tag => 'v'+s.version.to_s }

  s.platform              = :ios, '9.0'
  s.ios.deployment_target = '8.0'

  s.dependency 'React'
  s.dependency 'GoogleAppUtilities'
  s.dependency 'GoogleAuthUtilities'
  s.dependency 'GoogleNetworkingUtilities'
  s.dependency 'GoogleSignIn'
  s.dependency 'GoogleSymbolUtilities'
  s.dependency 'GoogleUtilities'

  s.preserve_paths      = 'LICENSE', 'README.md', 'package.json'
  s.source_files        = 'ios/**/*.{h,m}'
  s.exclude_files       = 'android/**/*'
end
