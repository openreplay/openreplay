class Record {
  constructor(values = {}) {
    const defaults = this.constructor.defaults || {};
    const data = Object.freeze({ ...defaults, ...values });

    Object.defineProperty(this, '_data', {
      value: data,
      enumerable: false,
      writable: false,
      configurable: false,
    });

    Object.keys(data).forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(this, k)) return;
      Object.defineProperty(this, k, {
        get: () => this._data[k],
        enumerable: true,
        configurable: false,
      });
    });

    Object.freeze(this);
  }

  static isRecord(value) {
    return value instanceof Record;
  }

  toJS() {
    return { ...this._data };
  }

  set(key, value) {
    return new this.constructor({ ...this._data, [key]: value });
  }

  validate() {
    return true;
  }

  exists() {
    const idKey = this.idKey || 'id';
    return this[idKey] !== undefined && this[idKey] !== '';
  }

  toData() {
    return this.toJS();
  }

  isComplete() {
    return true;
  }

  toJSON() {
    return this.toData();
  }
}

export default function createRecordFactory(fields = {}, options = {}) {
  const {
    idKey = 'key',
    keyKey = 'key',
    fromJS = (v) => v,
    toData,
    validate,
    isComplete,
    name = 'record',
    methods = {},
  } = options;

  let uniqueKey = 0xff;
  function nextKey() {
    uniqueKey += 1;
    return `${name}_${uniqueKey}`;
  }

  const defaults = { [keyKey]: undefined, ...fields }; // MODIFIED

  class RecordType extends Record {}
  RecordType.defaults = defaults;

  function recordFactory(values = {}) {
    return new RecordType(values);
  }
  recordFactory.prototype = RecordType.prototype;

  recordFactory.prototype.exists = function exists() {
    return !!this[idKey];
  };

  recordFactory.prototype.toData =
    toData ||
    function () {
      const data = this.toJS();
      delete data[keyKey];
      return data;
    };

  if (validate) recordFactory.prototype.validate = validate;
  if (isComplete) recordFactory.prototype.isComplete = isComplete;

  Object.keys(methods).forEach((methodKey) => {
    recordFactory.prototype[methodKey] = methods[methodKey];
  });

  function createRecord(values = {}) {
    if (Record.isRecord(values)) {
      return values.set(keyKey, nextKey());
    }
    return recordFactory({
      [keyKey]: nextKey(),
      ...fromJS(values),
    });
  }

  // TODO: add createRecord to prototype chain
  createRecord.extend = (newFields, newOptions = {}) =>
    createRecordFactory(
      { ...fields, ...newFields },
      { ...options, ...newOptions },
    );

  return createRecord;
}
