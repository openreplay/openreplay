import { Record } from 'immutable';

interface ITopDomains {
  chart?: any[]
}

class TopDomains {
  chart: ITopDomains["chart"] = []

  constructor(data: ITopDomains) {
    this.chart = data.chart
  }
}

function fromJS(data = {}) {
  if (data instanceof TopDomains) return data;
  return new TopDomains(data);
}

export default fromJS;