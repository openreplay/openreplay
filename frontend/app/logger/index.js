import { options } from 'App/dev/console';

function log(...args) {
  if (!window.env.PRODUCTION || options.verbose) {
    if (Object.keys(groupTm).length > 0) {
      console.groupEnd();
    }
    console.log(...args);
  }
}

function warn(...args) {
  if (!window.env.PRODUCTION || options.verbose) {
    console.warn(...args);
  }
}

function error(...args) {
  if (!window.env.PRODUCTION || options.verbose) {
    console.error(...args);
  }
}

let groupTm = {};

function group(groupName, ...args) {
  if (!window.env.PRODUCTION || options.verbose) {
    if (!groupTm[groupName]) {
      groupTm[groupName] = setTimeout(() => {
        console.groupEnd()
        delete groupTm[groupName]
      }, 500);
      console.groupCollapsed(groupName);
    }
    console.log(...args);
  }
}

export default {
  info: log,
  log,
  warn,
  error,
  group,
};
