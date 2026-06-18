import { getPlayerConfig } from './config';

function log(...args: any[]) {
  const cfg = getPlayerConfig().logger;
  if (cfg) {
    cfg.log(...args);
  } else {
    console.log(...args);
  }
}

function warn(...args: any[]) {
  const cfg = getPlayerConfig().logger;
  if (cfg) {
    cfg.warn(...args);
  } else {
    console.warn(...args);
  }
}

function error(...args: any[]) {
  const cfg = getPlayerConfig().logger;
  if (cfg) {
    cfg.error(...args);
  } else {
    console.error(...args);
  }
}

function group(...args: any[]) {
  const cfg = getPlayerConfig().logger;
  if (cfg?.group) {
    cfg.group(...args);
  } else {
    console.groupCollapsed(...args);
  }
}

export default {
  info: log,
  log,
  warn,
  error,
  group,
};
