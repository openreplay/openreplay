Pod::Spec.new do |s|
  s.name             = 'openreplay'
  s.version          = '1.0.9'
  s.summary          = 'OpenReplay session replay for Flutter.'
  s.description      = 'Native support for the OpenReplay Flutter SDK: JPEG encoding, system metrics and secure token storage.'
  s.homepage         = 'https://github.com/openreplay/openreplay'
  s.license          = { :file => '../LICENSE' }
  s.author           = { 'OpenReplay' => 'hello@openreplay.com' }
  s.source           = { :path => '.' }
  s.source_files     = 'openreplay/Sources/openreplay/**/*.swift'
  s.dependency 'Flutter'
  s.platform         = :ios, '13.0'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.swift_version    = '5.0'
end
