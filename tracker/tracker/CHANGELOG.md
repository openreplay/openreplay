## 4.1.10

- Added "tel" to supported input types
- Added `{ withCurrentTime: true }` to `tracker.getSessionURL` method which will return sessionURL with current session's timestamp

## 4.1.8

- recalculate timeOrigin on start to prevent wrong timestamps on "sleeping" sessions

## 4.1.7

- resend metadata on start

## 4.1.6

- remove log that potentially caused crashed during slow initial render
