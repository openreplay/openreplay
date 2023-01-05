
interface IResourceLoadingTime {
  avg: number;
  timestamp: number;
}

class ResourceLoadingTime {
  avg: IResourceLoadingTime["avg"];
  timestamp: IResourceLoadingTime["timestamp"];

  constructor(data: IResourceLoadingTime) {
    Object.assign(this, data)
  }
}

function fromJS(resourceLoadingTime = {}) {
  if (resourceLoadingTime instanceof ResourceLoadingTime) return resourceLoadingTime;
  return new ResourceLoadingTime(resourceLoadingTime);
}

export default fromJS;
