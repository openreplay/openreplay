import { Record } from 'immutable';

const IMAGE = "IMG";
const REQUEST = "REQUEST";
const PAGE = "LOCATION";

export const TYPES = {
  IMAGE,
  REQUEST,
  PAGE,
};

const Resource = Record({
  value: "",
  type: "",
});

function fromJS(resource = {}) {
  if (resource instanceof Resource) return resource;
  return new Resource(resource);
}

export default fromJS;
