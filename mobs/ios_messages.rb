message 107, 'IOSBatchMeta', :replayer => false  do
    uint 'Timestamp'
    uint 'Length'
    uint 'FirstIndex'
end

message 90, 'IOSSessionStart',  :replayer => true  do 
	uint 'Timestamp'
	# uint 'Length'
  
  uint 'ProjectID'
  string 'TrackerVersion'
  string 'RevID'
  string 'UserUUID'
  # string 'UserAgent'
  string 'UserOS'
  string 'UserOSVersion'
  # string 'UserBrowser'
  # string 'UserBrowserVersion'
  string 'UserDevice'
  string 'UserDeviceType'
  # uint 'UserDeviceMemorySize'
  # uint 'UserDeviceHeapSize'
  string 'UserCountry'
end

message 91, 'IOSSessionEnd'  do 
	uint 'Timestamp'
end

message 92, 'IOSMetadata' do
    uint 'Timestamp'
    uint 'Length'
    string 'Key'
    string 'Value'
end

message 93, 'IOSCustomEvent', :seq_index => true,  :replayer => true do
    uint 'Timestamp'
    uint 'Length'
    string 'Name'
    string 'Payload'
end

message 94, 'IOSUserID' do
    uint 'Timestamp'
    uint 'Length'
    string 'Value'
end

message 95, 'IOSUserAnonymousID' do
    uint 'Timestamp'
    uint 'Length'
    string 'Value'
end

message 96, 'IOSScreenChanges', :replayer => true do
    uint 'Timestamp'
    uint 'Length'
    uint 'X'
    uint 'Y'
    uint 'Width'
    uint 'Height'
end

message 97, 'IOSCrash', :seq_index => true do
    uint 'Timestamp'
    uint 'Length'
    string 'Name'
    string 'Reason'
    string 'Stacktrace' 
end

message 98, 'IOSScreenEnter', :seq_index => true do
    uint 'Timestamp'
    uint 'Length'
    string 'Title'
    string 'ViewName'
end

message 99, 'IOSScreenLeave' do
    uint 'Timestamp'
    uint 'Length'
    string 'Title'
    string 'ViewName'
end

message 100, 'IOSClickEvent', :seq_index => true,  :replayer => true do
    uint 'Timestamp'
    uint 'Length'
    string 'Label'
    uint 'X'
    uint 'Y'
end

message 101, 'IOSInputEvent', :seq_index => true do
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
?"activeProcessorCount": Number of currently used processors
"systemUptime": Elapsed time (in seconds) since last boot
?"isLowPowerModeEnabled": Possible values (1 or 0)
2/3!"thermalState": Possible values (0:nominal 1:fair 2:serious 3:critical)
!"batteryLevel": Possible values (0 .. 100)
"batteryState": Possible values (0:unknown 1:unplugged 2:charging 3:full)
"orientation": Possible values (0unknown 1:portrait 2:portraitUpsideDown 3:landscapeLeft 4:landscapeRight 5:faceUp 6:faceDown)
"mainThreadCPU": Possible values (0 .. 100)
"memoryUsage": Used memory in bytes
=end
message 102, 'IOSPerformanceEvent', :replayer => true, :seq_index => true do
  uint 'Timestamp'
  uint 'Length'
  string 'Name'
  uint 'Value'
end

message 103, 'IOSLog', :replayer => true do
  uint 'Timestamp'
  uint 'Length'
  string 'Severity' # Possible values ("info", "error")
  string 'Content'
end

message 104, 'IOSInternalError' do
  uint 'Timestamp'
  uint 'Length'
  string 'Content'
end

message 105, 'IOSNetworkCall', :replayer => true, :seq_index => true do
  uint 'Timestamp'
  uint 'Length'
  uint 'Duration'
  string 'Headers'
  string 'Body'
  string 'URL'
  boolean 'Success'
  string 'Method'
  uint 'Status'
end
message 110, 'IOSPerformanceAggregated', :swift => false do 
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

message 111, 'IOSIssueEvent', :seq_index => true do
  uint 'Timestamp'
  string 'Type'
  string 'ContextString'
  string 'Context'
  string 'Payload'
end
