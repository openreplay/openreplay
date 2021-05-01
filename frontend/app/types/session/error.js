import Record from 'Types/Record';


function getStck0InfoString(stack) {
  const stack0 = stack[0];
  if (!stack0) return "";
  let s = stack0.function || "";
  if (stack0.url) {
    s += ` (${stack0.url})`;
  }
  return s;
}


export default Record({
  sessionId: undefined,
  messageId: undefined,
  timestamp: undefined,
  errorId: undefined,
  projectId: undefined,
  source: undefined,
  name: undefined,
  message: undefined,
  time: undefined,
  function: '?',
}, {
  fromJS: ({ stack, ...rest }) => ({
    ...rest,
    stack0InfoString: getStck0InfoString(stack || []),
    function: (stack && stack[0] && stack[0].function) || '?',
  }),
});
