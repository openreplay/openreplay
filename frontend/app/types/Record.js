const { Record } = require('immutable');

Record.prototype.validate = function validate() { return true; };
Record.prototype.isComplete = function isComplete() { return true; };
// Record.prototype.toData = function toData() {
//   return this.toJS();
// };

export default function createRecordFactory(fields = {}, options = {}) {
  const {
    idKey = 'key',
    keyKey = 'key',
    fromJS = v => v,
    toData,
    validate,
    isComplete,
    name='record', // = "Record",  // gets wrong in production when use as immutable' Record's name
    methods = {},
  } = options;

  let uniqueKey = 0xff;
  function nextKey() {
    uniqueKey += 1;
    return `${ name }_${ uniqueKey }`;
  }

  const recordFactory = Record({ [ keyKey ]: undefined, ...fields });
  recordFactory.prototype.exists = function exists() {
    return !!this[ idKey ];
  };

  recordFactory.prototype.toData = toData ||
    function() {
      const data = this.toJS();
      delete data[keyKey];
      return data;
    };
  if (validate) recordFactory.prototype.validate = validate;
  if (isComplete) recordFactory.prototype.isComplete = isComplete;
  Object.keys(methods).forEach((methodKey) => {
    recordFactory.prototype[ methodKey ] = methods[ methodKey ];
  });

  function createRecord(values = {}) {
    if (Record.isRecord(values)) {
      // const descriptiveName = Record.getDescriptiveName(values);
      // if (name && descriptiveName !== name) {
      //   throw new Error(`Wrong record type: ${ name } expected, but got ${ descriptiveName }`);
      // }
      return values.set(keyKey, nextKey());
    }
    return recordFactory({
      [ keyKey ]: nextKey(),
      ...fromJS(values),
    });
  }

  // TODO: add createRecord to prototype chain
  createRecord.extend = (newFields, newOptions = {}) =>
    createRecordFactory({ ...fields, ...newFields }, { ...options, ...newOptions });

  return createRecord;
}
