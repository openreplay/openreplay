export const trackerUrl = (isAssistEnabled: boolean) =>
  `${window.env.TRACKER_HOST || '//static.openreplay.com'}/${window.env.TRACKER_VERSION}/openreplay${isAssistEnabled ? '-assist.js' : '.js'}`;
