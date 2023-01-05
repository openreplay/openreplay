interface ITimeToRender {
  avg?: number
  chart?: any[]
}

class TimeToRender {
  avg: ITimeToRender["avg"]
  chart: ITimeToRender["chart"] = []

  constructor(data: ITimeToRender) {
    Object.assign(this, data)
  }
}

function fromJS(data = {}) {
  if (data instanceof TimeToRender) return data;
  return new TimeToRender(data);
}

export default fromJS;