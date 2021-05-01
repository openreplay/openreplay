import { Record } from 'immutable';

const ResourceLoadingTime = Record({
  avg: undefined,
  timestamp: undefined
});

function fromJS(resourceLoadingTime = {}) {
  if (resourceLoadingTime instanceof ResourceLoadingTime) return resourceLoadingTime;
  return new ResourceLoadingTime(resourceLoadingTime);
}

export default fromJS;
