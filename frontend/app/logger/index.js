import { options } from 'App/dev/console';
import ENV from '../../env';

function log(...args) {
  if (!ENV.PRODUCTION || options.verbose) {
    if (Object.keys(groupTm).length > 0) {
      console.groupEnd();
    }
    console.log(...args);
  }
}

function warn(...args) {
  if (!ENV.PRODUCTION || options.verbose) {
    console.warn(...args);
  }
  options.exceptionsLogs.push(args);
}

function error(...args) {
  if (!ENV.PRODUCTION || options.verbose) {
    console.error(...args);
    options.exceptionsLogs.push(args);
  }
}

let groupTm = {};
const groupedLogs = {};

function group(groupName, ...args) {
  if (!ENV.PRODUCTION || options.verbose) {
    if (groupTm[groupName]) {
      clearTimeout(groupTm[groupName]);
      groupTm[groupName] = null;
    } else {
      groupedLogs[groupName] = [];
    }
    groupedLogs[groupName].push(args);

    groupTm[groupName] = setTimeout(() => {
      console.groupCollapsed(groupName);
      groupedLogs[groupName].forEach((log) => {
        console.log(...log);
      });
      console.groupEnd();
      delete groupTm[groupName];
      delete groupedLogs[groupName];
    }, 500);
    options.exceptionsLogs.push(args);
  }
}

export default {
  info: log,
  log,
  warn,
  error,
  group,
};
