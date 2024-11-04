import Record from 'Types/Record';

const getIconDetails = (type) => {
  // const randomColor = colors[Math.floor(Math.random() * colors.length) ];

  switch(type) {
    case 'click_rage':
      return { icon: 'funnel/emoji-angry-fill', color: '#CC0000' };
    case 'dead_click':
      return { icon: 'funnel/emoji-dizzy-fill', color: '#9C001F' };
    case 'excessive_scrolling':
      return { icon: 'funnel/mouse', color: '#D3545F' };
    case 'bad_request':
      return { icon: 'funnel/patch-exclamation-fill', color: '#D70072' };
    case 'missing_resource':
      return { icon: 'funnel/image-fill', color: '#B89C50' };
    case 'memory':
      return { icon: 'funnel/cpu-fill', color: '#8A5A83' };
    case 'cpu':
      return { icon: 'funnel/hdd-fill', color: '#8A5A83' };
    case 'slow_resource':
      return { icon: 'funnel/hourglass-top', color: '#8B006D' };
    case 'slow_page_load':
      return { icon: 'funnel/hourglass-top', color: '#8B006D' };
    case 'custom_event_error':
    case 'custom':
      return { icon: 'funnel/exclamation-circle-fill', color: '#BF6C00' };
    case 'crash':
      return { icon: 'funnel/file-x', color: '#BF2D00' };
    case 'js_exception':
      return { icon: 'funnel/exclamation-circle', color: '#BF2D00' };
  }

  return {
    icon: 'info',
    color: 'red'
  }
}

export default Record({
  issueId: undefined,
  name: undefined,
  title: undefined,
  icon: '',
  type: undefined,
  contextString: undefined,
  affectedUsers: 0,
  conversionImpact: 0,
  lostConversions: 0,
  affectedSessions: 0,
  unaffectedSessions: 0,
  lostConversionsPer: 0,
  affectedSessionsPer: 0,
  unaffectedSessionsPer: 0
}, {
  idKey: 'issueId',
  methods: {
    validate() {
      return true;
    },
  },
  fromJS: ({ contextString, type, ...rest }) => {
    const total = rest.lostConversions + rest.affectedSessions + rest.unaffectedSessions;
    const lostConversionsPer = parseInt(rest.lostConversions * 100 / total);
    const affectedSessionsPer = parseInt(rest.affectedSessions * 100 / total);
    const unaffectedSessionsPer = parseInt(rest.unaffectedSessions * 100 / total);
    return {
      ...rest,
      icon: getIconDetails(type),
      type,
      contextString: contextString || 'NA',
      // name: type && type.replace('_', ' '),
      lostConversionsPer: lostConversionsPer < 10 ? 10 : lostConversionsPer,
      affectedSessionsPer: affectedSessionsPer < 10 ? 10 : affectedSessionsPer,
      unaffectedSessionsPer: unaffectedSessionsPer < 10 ? 10 : unaffectedSessionsPer
    }
  }
});
