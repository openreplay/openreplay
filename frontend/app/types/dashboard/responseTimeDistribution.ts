interface IResponseTimeDistribution {
  chart: any[],
  avg: number,
  percentiles: number[],
  extremeValues: number[],
  total: number
}

class ResponseTimeDistribution {
  chart: IResponseTimeDistribution["chart"] = []
  avg: IResponseTimeDistribution["avg"]
  percentiles: IResponseTimeDistribution["percentiles"] = []
  extremeValues: IResponseTimeDistribution["extremeValues"] = []
  total: IResponseTimeDistribution["total"]

  constructor(data: IResponseTimeDistribution) {
    Object.assign(this, data)
  }
}


function fromJS(data = {}) {
  if (data instanceof ResponseTimeDistribution) return data;
  return new ResponseTimeDistribution(data);
}

export default fromJS;