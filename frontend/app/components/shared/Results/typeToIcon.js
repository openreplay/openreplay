export default (label) => {
  switch (label) {
    case 'Start Session':
      return 'play'; // start
    case 'End Session':
      return 'pause';  //end
    case 'Get Status':
    case 'Get Sessions List':
    case 'Get Session Capabilites':
      return 'eye'; // session
    case 'Get Session Timeouts':
    case 'Implicitly Wait':
    case 'Set Session Timeouts':
      return 'stopwatch';
    case 'Get Current URL':
    case 'Open URL':
      return 'event/link';
    case 'Go Back':
    case 'Go Forward':
    case 'Refresh':
      return 'window';  //navigation
    case 'Get Title':
    case 'Get Current Window Handle':
    case 'Switch to Window':
    case 'Close Window':
    case 'Get Window Handles':
    case 'Switch to Frame':
    case 'Switch to Parent Frame':
    case 'Get Window Rect':
    case 'Set Window Rect':
      return 'desktop';   // window-general
    case 'Maximize Window':
    case 'Minimize Window':
    case 'Fullscreen Window':
      return 'event/resize'; //window-interactions
    case 'Get Active Element':
    case 'Find Element':
    case 'Find Elements':
    case 'Find Child Element':
    case 'Find Child Elements':
    case 'Is Element Selected?':
    case 'Get Element Attribute':
    case 'Get Element Property':
    case 'Get Element Value of CSS Property':
    case 'Get Element Text':
    case 'Get Element Tag Name':
    case 'Get Element Rect':
    case 'Is Element Enabled?':
    case 'Is Element Displayed?':
    case 'Element Equals':
    case 'Clear Element':
      return 'search';  // element
    case 'Click Element':
    case 'Submit':
      return 'event/click';
    case 'Send Keys to Element':
      return 'event/input';
    case 'Execute':
    case 'Get Page Source':
    case 'Execute Script':
    case 'Execute Async Script':
      return 'code';
    case 'Get All Cookies':
    case 'Get Named Cookie':
    case 'Add Cookie':
    case 'Delete All Cookies':
    case 'Delete Named Cookie':
      return 'cookies';
    case 'Dismiss Alert':
    case 'Accept Alert':
    case 'Get Alert Text':
    case 'Send Keys to Alert':
    case 'Set Alert Credentials':
      return 'console/warning';
    case 'Take Screenshot':
    case 'Take Element Screenshot':
      return 'camera';
    default:
      return 'ellipsis-v';
  }
};
