interface IResponseTime {
  avg: number;
  chart: any[];
}

class ResponseTime {
  avg: IResponseTime["avg"]
  chart: IResponseTime["chart"] = []

  constructor(data: IResponseTime) {
    Object.assign(this, data)
  }
}

function fromJS(data = {}) {
  if (data instanceof ResponseTime) return data;
  return new ResponseTime(data);
}

export default fromJS;