message 90, 'MobileSessionStart',  :replayer => false  do
	uint 'Timestamp'
    uint 'ProjectID'
    string 'TrackerVersion'
    string 'RevID'
    string 'UserUUID'
    string 'UserOS'
    string 'UserOSVersion'
    string 'UserDevice'
    string 'UserDeviceType'
    string 'UserCountry'
end

message 91, 'MobileSessionEnd'  do
	uint 'Timestamp'
end

message 92, 'MobileMetadata' do
    uint 'Timestamp'
    uint 'Length'
    string 'Key'
    string 'Value'
end

message 93, 'MobileEvent', :replayer => true do
    uint 'Timestamp'
    uint 'Length'
    string 'Name'
    string 'Payload'
end

message 94, 'MobileUserID' do
    uint 'Timestamp'
    uint 'Length'
    string 'ID'
end

message 95, 'MobileUserAnonymousID' do
    uint 'Timestamp'
    uint 'Length'
    string 'ID'
end

message 96, 'MobileScreenChanges', :replayer => true do
    uint 'Timestamp'
    uint 'Length'
    uint 'X'
    uint 'Y'
    uint 'Width'
    uint 'Height'
end

message 97, 'MobileCrash' do
    uint 'Timestamp'
    uint 'Length'
    string 'Name'
    string 'Reason'
    string 'Stacktrace'
end

message 98, 'MobileViewComponentEvent' do
    uint 'Timestamp'
    uint 'Length'
    string 'ScreenName'
    string 'ViewName'
    boolean 'Visible'
end

message 100, 'MobileClickEvent', :replayer => true do
    uint 'Timestamp'
    uint 'Length'
    string 'Label'
    uint 'X'
    uint 'Y'
end

message 101, 'MobileInputEvent', :replayer => true do
    uint 'Timestamp'
    uint 'Length'
    string 'Value'
    boolean 'ValueMasked'
    string 'Label'
end

=begin
Name/Value may be :
"physicalMemory": Total memory in bytes
"processorCount": Total processors in device
"activeProcessorCount": Number of currently used processors
"systemUptime": Elapsed time (in seconds) since last boot
"isLowPowerModeEnabled": Possible values (1 or 0)
"thermalState": Possible values (0:nominal 1:fair 2:serious 3:critical)
"batteryLevel": Possible values (0 .. 100)
"batteryState": Possible values (0:unknown 1:unplugged 2:charging 3:full)
"orientation": Possible values (0unknown 1:portrait 2:portraitUpsideDown 3:landscapeLeft 4:landscapeRight 5:faceUp 6:faceDown)
"mainThreadCPU": Possible values (0 .. 100)
"memoryUsage": Used memory in bytes
"fps": Frames per second
=end
message 102, 'MobilePerformanceEvent', :replayer => true do
  uint 'Timestamp'
  uint 'Length'
  string 'Name'
  uint 'Value'
end

message 103, 'MobileLog', :replayer => true do
  uint 'Timestamp'
  uint 'Length'
  string 'Severity' # Possible values ("info", "error")
  string 'Content'
end

message 104, 'MobileInternalError', :replayer => true do
  uint 'Timestamp'
  uint 'Length'
  string 'Content'
end

message 105, 'MobileNetworkCall', :replayer => true do
   uint 'Timestamp'
   uint 'Length'
   string 'Type'
   string 'Method'
   string 'URL'
   string 'Request'
   string 'Response'
   uint 'Status'
   uint 'Duration'
end

message 106, 'MobileSwipeEvent', :replayer => true do
    uint 'Timestamp'
    uint 'Length'
    string 'Label'
    uint 'X'
    uint 'Y'
    string 'Direction'
end

message 107, 'MobileBatchMeta' do
    uint 'Timestamp'
    uint 'Length'
    uint 'FirstIndex'
end

message 110, 'MobilePerformanceAggregated', :swift => false do 
  uint 'TimestampStart'
  uint 'TimestampEnd'
  uint 'MinFPS'
  uint 'AvgFPS'
  uint 'MaxFPS'
  uint 'MinCPU'
  uint 'AvgCPU'
  uint 'MaxCPU'
  uint 'MinMemory'
  uint 'AvgMemory'
  uint 'MaxMemory'
  uint 'MinBattery'
  uint 'AvgBattery'
  uint 'MaxBattery'
end

message 111, 'MobileIssueEvent', :replayer => true do
  uint 'Timestamp'
  string 'Type'
  string 'ContextString'
  string 'Context'
  string 'Payload'
end
