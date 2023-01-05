interface ISpeedLocation {
  avg?: number
  chart?: any[]
}

class SpeedLocation {
  avg?: ISpeedLocation["avg"]
  chart?: ISpeedLocation["chart"]

  constructor(data: ISpeedLocation) {
    Object.assign(this, data)
  }
}

function fromJS(data = {}) {
  if (data instanceof SpeedLocation) return data;
  return new SpeedLocation(data);
}

export default fromJS;