interface ITopMetrics {
  avgResponseTime: number
  requestsCount: number
  avgTimeTilFirstBite: number
  avgDomCompleteTime: number
}

export default class TopMetrics {
  avgResponseTime: ITopMetrics["avgResponseTime"] = 0
  requestsCount: ITopMetrics["requestsCount"] = 0
  avgTimeTilFirstBite: ITopMetrics["avgTimeTilFirstBite"] = 0
  avgDomCompleteTime: ITopMetrics["avgDomCompleteTime"] = 0

  constructor(data: ITopMetrics) {
    Object.assign(this, data)
  }
}