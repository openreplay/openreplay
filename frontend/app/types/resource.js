const IMAGE = 'IMG';
const REQUEST = 'REQUEST';
const PAGE = 'LOCATION';

export const TYPES = {
  IMAGE,
  REQUEST,
  PAGE,
};

class Resource {
  constructor({ value = '', type = '' } = {}) {
    this.value = value;
    this.type = type;
  }

  toJS = () => ({
    value: this.value,
    type: this.type,
  });

  static fromJS = (data = {}) => new Resource(data);

  toJSON = this.toJS;

  toData = this.toJS;
}

function fromJS(resource = {}) {
  if (resource instanceof Resource) return resource;
  return new Resource(resource);
}

export default fromJS;
