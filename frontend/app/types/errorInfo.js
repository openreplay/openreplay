import { List } from 'immutable';
import Record from './Record';
import Session from './session';

export const RESOLVED = "resolved";
export const UNRESOLVED = "unresolved";
export const IGNORED = "ignored";
export const BOOKMARK = "bookmark";


function getStck0InfoString(stack) {
  const stack0 = stack[0];
  if (!stack0) return "";
  let s = stack0.function || "";
  if (stack0.url) {
    s += ` (${stack0.url})`;
  }
  return s;
}

const ErrorInfo = Record({
  errorId: undefined,
  favorite: false,
  viewed: false,
  source: "",
  name: "",
  message: "",
  stack0InfoString: '',
  status: "",
  parentErrorId: "",
  users: 8,
  sessions: 25,
  lastOccurrence: 1587744479000,
  firstOccurrence: 1585213274000,
  chart: [],
  chart24: [],
  chart30: [],
  tags: [],
  customTags: [],
  lastHydratedSession: Session(),
  disabled: false,
}, {
  fromJS: ({ stack, lastHydratedSession, ...other }) => ({
    ...other,
    lastHydratedSession: Session(lastHydratedSession),
    stack0InfoString: getStck0InfoString(stack || []),
  })
});

export default ErrorInfo;
