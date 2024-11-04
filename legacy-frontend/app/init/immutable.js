import { Record } from 'immutable';

Record.prototype.exists = function exists() {
  const idKey = this.idKey || 'id';
  return this[ idKey ] !== undefined && this[ idKey ] !== '';
};
Record.prototype.validate = () => true;
Record.prototype.isComplete = () => true;
Record.prototype.toData = function toData() {
  return this.toJS();
};
