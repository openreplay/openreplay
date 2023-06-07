## 6.0.0

- added support for multi tab assist session

## 5.0.2

- Added `onCallDeny`, `onRemoteControlDeny` and `onRecordingDeny` callbacks to signal denial of user's consent to call/control/recording

## 5.0.1

- dependency updates

## 5.0.0

- fix recording state import 

## 4.1.5

- fixed peerjs hack that caused ts compile issues
- - added screen recording feature (EE) license

## 4.1.4

- added peerjs hack `Peer = Peer.default || Peer` to prevent webpack 5 import error

## 4.1.3

- fixed issue with agents reconnecting on new page (setting array without agentinfo)

## 4.1.2

- added agentInfo object to most assist actions callbacks
- added relative path (with port support) for assist connection
- ensure releaseControl is called when session is stopped
- fixed videofeed window sizes
- fixed "black squares" in videofeed when one of the users turn off camera
- fixed html chat snippet layout

## 4.1.x-4.1.1

- mice name tags
- smaller font for cursor
- remote control status for end user
