// this can be reducer level to call it once and optimize the performance.
export default (iconName="") => {
  switch (iconName.toLocaleLowerCase()) {
    case 'chrome':
    case 'chrome mobile':
    case 'chrome mobile webview':
    case 'chrome mobile ios':
    case 'headlesschrome':
      return 'chrome';
    case 'safari':
    case 'mobile safari':
    case 'mobile safari ui/wkwebview':
      return 'safari';
    case 'firefox':
    case 'firefox ios':
    case 'firefox mobile':
      return 'firefox';
    case 'opera mobile':
    case 'opera':
      return 'opera';
    case 'facebook':
      return 'facebook';
    case 'edge':
      return 'edge';
    case 'ie':
      return 'ie';
    default:
      return 'browser';
  }
};
