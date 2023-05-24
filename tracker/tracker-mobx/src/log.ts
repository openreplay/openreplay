// Based on https://github.com/winterbe/mobx-logger/blob/master/src/log.js
// though it is not used anymore due to spy() being no op in production

interface TrackerMobXConfig {
  enabled?: boolean;
  methods?: { [method: string]: boolean };
}

const isLoggingEnabled = (ev): boolean => {
  if (typeof ev.object !== 'object' || ev.object === null) {
    return false;
  }
  const loggerConfig = ev.object.constructor
    .trackerMobXConfig as TrackerMobXConfig;
  if (loggerConfig === undefined) {
    return true;
  }
  const enabled = loggerConfig.enabled === true;
  if (loggerConfig.methods === undefined) {
    return enabled;
  }
  const methodLoggerConfig = loggerConfig.methods[getPropName(ev)];
  if (methodLoggerConfig === undefined) {
    return enabled;
  }
  return methodLoggerConfig;
};

const getPropName = ev => {
  if (ev.name != null) {
    return ev.name;
  }
  return (
    Object.keys(ev.object.$mobx.values).filter(
      key => ev.object.$mobx.values[key].derivation === ev.fn,
    )[0] || ''
  );
};


const reaction = ev => {
  const name = ev.name.replace('#null', '');

  const observables = ev.observing || [];
  const names = observables.map(it => it.name);

  return { name, names };
};

const transaction = ev => {
  return { name: ev.name };
};

const compute = ev => {
  if (!isLoggingEnabled(ev)) {
    return;
  }
  const name = getPropName(ev);
  return { name };
};


const observeAction = ev => {
  const state = {}
  for (let property in ev.object) {
    if (typeof property !== 'function') {
      state[property] = ev.object[property]
    }
  }
  return {
    state,
    type: ev.type,
    property: ev.name,
  }
}

const action = ev => {
  if (!isLoggingEnabled(ev)) {
    return;
  }

  return { name: ev.name, arguments: ev.arguments, object: ev.object };
};


export default {
  // action,
  // reaction,
  // transaction,
  // compute,
  update: observeAction,
  delete: observeAction,
  add: observeAction
};
