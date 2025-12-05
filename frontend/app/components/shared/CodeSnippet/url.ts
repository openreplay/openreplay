import ENV from '../../../../env';

export const trackerUrl = (isAssistEnabled: boolean) =>
  `${ENV.TRACKER_HOST || '//static.openreplay.com'}/${ENV.TRACKER_VERSION}/openreplay${isAssistEnabled ? '-assist.js' : '.js'}`;
