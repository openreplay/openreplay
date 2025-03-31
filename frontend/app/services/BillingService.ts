export default class BillingService {
  initClient(arg: any) {
    return;
  }

  fetchPlan = async () => {
    return Promise.resolve()
  }

  fetchInvoices = async (period: {
    startTimestamp: number,
    endTimestamp: number,
    limit: number,
    page: number,
  }) => {
    return Promise.resolve()
  }

  upgradePlan = async (instance: any) => {
    return Promise.resolve()
  }

  updatePlan = async (instance: any) => {
    return Promise.resolve()
  }

  cancelPlan = async () => {
    return Promise.resolve()
  }

  enablePlan = async () => {
    return Promise.resolve()
  }

  getOnboard = async () => {
    return Promise.resolve()
  }
}
