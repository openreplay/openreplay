# Special one for Batch Meta. Message id could define the version 
# Depricated since tracker 3.6.0 in favor of BatchMetadata
message 80, 'BatchMeta', :js => false, :replayer => false do 
  uint 'PageNo'
  uint 'FirstIndex'
  int 'Timestamp'
end

# since tracker 3.6.0
message 81, 'BatchMetadata', :replayer => false do
  uint 'Version'
  uint 'PageNo'
  uint 'FirstIndex'
  int 'Timestamp'
  string 'Location'
end

# since tracker 3.6.0
message 82, 'PartitionedMessage', :replayer => false do
  uint 'PartNo'
  uint 'PartTotal'
end


message 0, 'Timestamp' do
  uint 'Timestamp'
end
message 1, 'SessionStart', :js => false, :replayer => false do
  uint 'Timestamp'
  uint 'ProjectID'
  string 'TrackerVersion'
  string 'RevID'
  string 'UserUUID'
  string 'UserAgent'
  string 'UserOS'
  string 'UserOSVersion'
  string 'UserBrowser'
  string 'UserBrowserVersion'
  string 'UserDevice'
  string 'UserDeviceType'
  uint 'UserDeviceMemorySize'
  uint 'UserDeviceHeapSize'
  string 'UserCountry'
  string 'UserID'
end
# Depricated (not used) since OpenReplay tracker 3.0.0
message 2, 'SessionDisconnect', :js => false do
  uint 'Timestamp'
end
message 3, 'SessionEnd', :js => false, :replayer => false do
  uint 'Timestamp'
end
message 4, 'SetPageLocation' do
  string 'URL'
  string 'Referrer'
  uint 'NavigationStart'
end
message 5, 'SetViewportSize' do
  uint 'Width'
  uint 'Height'
end
message 6, 'SetViewportScroll' do
  int 'X'
  int 'Y'
end
message 7, 'CreateDocument' do
end
message 8, 'CreateElementNode' do
  uint 'ID'
  uint 'ParentID'
  uint 'index'
  string 'Tag'
  boolean 'SVG'
end
message 9, 'CreateTextNode' do
  uint 'ID'
  uint 'ParentID'
  uint 'Index'
end
message 10, 'MoveNode' do
  uint 'ID'
  uint 'ParentID'
  uint 'Index'
end
message 11, 'RemoveNode' do
  uint 'ID'
end
message 12, 'SetNodeAttribute' do
  uint 'ID'
  string 'Name'
  string 'Value'
end
message 13, 'RemoveNodeAttribute' do
  uint 'ID'
  string 'Name'
end
message 14, 'SetNodeData' do
  uint 'ID'
  string 'Data'
end
message 15, 'SetCSSData', :js => false do
  uint 'ID'
  string 'Data'
end
message 16, 'SetNodeScroll' do
  uint 'ID'
  int 'X'
  int 'Y'
end
message 17, 'SetInputTarget', :replayer => false do
  uint 'ID'
  string 'Label'
end
message 18, 'SetInputValue' do
  uint 'ID'
  string 'Value'
  int 'Mask'
end
message 19, 'SetInputChecked' do
  uint 'ID'
  boolean 'Checked'
end
message 20, 'MouseMove' do
  uint 'X'
  uint 'Y'
end
# Depricated since OpenReplay 1.2.0
message 21, 'MouseClickDepricated', :js => false, :replayer => false do
  uint 'ID'
  uint 'HesitationTime'
  string 'Label'
end
message 22, 'ConsoleLog' do
  string 'Level'
  string 'Value'
end
message 23, 'PageLoadTiming', :replayer => false do
  uint 'RequestStart'
  uint 'ResponseStart'
  uint 'ResponseEnd'
  uint 'DomContentLoadedEventStart'
  uint 'DomContentLoadedEventEnd'
  uint 'LoadEventStart'
  uint 'LoadEventEnd'
  uint 'FirstPaint'
  uint 'FirstContentfulPaint'
end
message 24, 'PageRenderTiming', :replayer => false do
  uint 'SpeedIndex'
  uint 'VisuallyComplete'
  uint 'TimeToInteractive'
end
message 25, 'JSException', :replayer => false do
  string 'Name'
  string 'Message'
  string 'Payload'
end
message 26, 'IntegrationEvent', :js => false, :replayer => false do
  uint 'Timestamp'
  string 'Source'
  string 'Name'
  string 'Message'
  string 'Payload'
end
message 27, 'RawCustomEvent', :replayer => false do
  string 'Name'
  string 'Payload'
end
message 28, 'UserID', :replayer => false do
  string 'ID'
end
message 29, 'UserAnonymousID', :replayer => false do
  string 'ID'
end
message 30, 'Metadata', :replayer => false do
  string 'Key'
  string 'Value'
end
message 31, 'PageEvent', :js => false, :replayer => false do
  uint 'MessageID'
  uint 'Timestamp'
  string 'URL'
  string 'Referrer'
  boolean 'Loaded'
  uint 'RequestStart'
  uint 'ResponseStart'
  uint 'ResponseEnd'
  uint 'DomContentLoadedEventStart'
  uint 'DomContentLoadedEventEnd'
  uint 'LoadEventStart'
  uint 'LoadEventEnd'
  uint 'FirstPaint'
  uint 'FirstContentfulPaint'
  uint 'SpeedIndex'
  uint 'VisuallyComplete'
  uint 'TimeToInteractive'
end
message 32, 'InputEvent', :js => false, :replayer => false do
  uint 'MessageID'
  uint 'Timestamp'
  string 'Value'
  boolean 'ValueMasked'
  string 'Label'
end
message 33, 'ClickEvent', :js => false, :replayer => false do
  uint 'MessageID'
  uint 'Timestamp'
  uint 'HesitationTime'
  string 'Label'
  string 'Selector'
end
message 34, 'ErrorEvent', :js => false, :replayer => false do
  uint 'MessageID'
  uint 'Timestamp'
  string 'Source'
  string 'Name'
  string 'Message'
  string 'Payload'
end
message 35, 'ResourceEvent', :js => false, :replayer => false do
  uint 'MessageID'
  uint 'Timestamp'
  uint 'Duration'
  uint 'TTFB'
  uint 'HeaderSize'
  uint 'EncodedBodySize'
  uint 'DecodedBodySize'
  string 'URL'
  string 'Type'
  boolean 'Success'
  string 'Method'
  uint 'Status'
end
message 36, 'CustomEvent', :js => false, :replayer => false do
  uint 'MessageID'
  uint 'Timestamp'
  string 'Name'
  string 'Payload'
end


message 37, 'CSSInsertRule' do
  uint 'ID'
  string 'Rule'
  uint 'Index'
end
message 38, 'CSSDeleteRule' do
  uint 'ID'
  uint 'Index'
end

message 39, 'Fetch' do
  string 'Method'
  string 'URL'
  string 'Request'
  string 'Response'
  uint 'Status'
  uint 'Timestamp'
  uint 'Duration'
end
message 40, 'Profiler' do
  string 'Name'
  uint   'Duration'
  string 'Args'
  string 'Result'
end

message 41, 'OTable' do
  string 'Key'
  string 'Value'
end
message 42, 'StateAction', :replayer => false do
  string 'Type'
end
message 43, 'StateActionEvent', :js => false, :replayer => false do
  uint 'MessageID'
  uint 'Timestamp'
  string 'Type'
end

message 44, 'Redux' do
  string 'Action'
  string 'State'
  uint 'Duration'
end
message 45, 'Vuex' do
  string 'Mutation'
  string 'State'
end
message 46, 'MobX' do
  string 'Type'
  string 'Payload'
end
message 47, 'NgRx' do
  string 'Action'
  string 'State'
  uint 'Duration'
end
message 48, 'GraphQL' do
  string 'OperationKind'
  string 'OperationName'
  string 'Variables'
  string 'Response'
end
message 49, 'PerformanceTrack' do
  int 'Frames'
  int 'Ticks'
  uint 'TotalJSHeapSize'
  uint 'UsedJSHeapSize'
end
message 50, 'GraphQLEvent',  :js => false, :replayer => false do
  uint 'MessageID'
  uint 'Timestamp'
  string 'OperationKind'
  string 'OperationName'
  string 'Variables'
  string 'Response'
end
message 51, 'FetchEvent',  :js => false, :replayer => false do
  uint 'MessageID'
  uint 'Timestamp'
  string 'Method'
  string 'URL'
  string 'Request'
  string 'Response'
  uint 'Status'
  uint 'Duration'
end
message 52, 'DOMDrop', :js => false, :replayer => false do
  uint 'Timestamp'
end
message 53, 'ResourceTiming', :replayer => false do
  uint 'Timestamp'
  uint 'Duration'
  uint 'TTFB'
  uint 'HeaderSize'
  uint 'EncodedBodySize'
  uint 'DecodedBodySize'
  string 'URL'
  string 'Initiator'
end
message 54, 'ConnectionInformation' do
  uint 'Downlink'
  string 'Type'
end
message 55, 'SetPageVisibility' do
  boolean 'hidden'
end
message 56, 'PerformanceTrackAggr', :js => false, :replayer => false do
  uint 'TimestampStart'
  uint 'TimestampEnd'
  uint 'MinFPS'
  uint 'AvgFPS'
  uint 'MaxFPS'
  uint 'MinCPU'
  uint 'AvgCPU'
  uint 'MaxCPU'
  uint 'MinTotalJSHeapSize'
  uint 'AvgTotalJSHeapSize'
  uint 'MaxTotalJSHeapSize'
  uint 'MinUsedJSHeapSize'
  uint 'AvgUsedJSHeapSize'
  uint 'MaxUsedJSHeapSize'
end
message 59, 'LongTask' do
  uint 'Timestamp'
  uint 'Duration'
  uint 'Context'
  uint 'ContainerType'
  string 'ContainerSrc'
  string 'ContainerId'
  string 'ContainerName'
end
message 60, 'SetNodeAttributeURLBased', :replayer => false do
  uint 'ID'
  string 'Name'
  string 'Value'
  string 'BaseURL'
end
# Might replace SetCSSData (although BaseURL is useless after rewriting)
message 61, 'SetCSSDataURLBased', :replayer => false do
  uint 'ID'
  string 'Data'
  string 'BaseURL'
end
message 62, 'IssueEvent', :replayer => false, :js => false do
  uint 'MessageID'
  uint 'Timestamp'
  string 'Type'
  string 'ContextString'
  string 'Context'
  string 'Payload'
end
message 63, 'TechnicalInfo', :replayer => false do
  string 'Type'
  string 'Value'
end
message 64, 'CustomIssue', :replayer => false do
  string 'Name'
  string 'Payload'
end
message 66, 'AssetCache', :replayer => false, :js => false do
  string 'URL'
end
message 67, 'CSSInsertRuleURLBased', :replayer => false do
  uint 'ID'
  string 'Rule'
  uint 'Index'
  string 'BaseURL'
end
message 69, 'MouseClick' do
  uint 'ID'
  uint 'HesitationTime'
  string 'Label'
  string 'Selector'
end

# Since 3.4.0
message 70, 'CreateIFrameDocument' do
  uint 'FrameID'
  uint 'ID'
end