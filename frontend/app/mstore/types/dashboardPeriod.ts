import Period, { LAST_24_HOURS } from 'Types/app/period';

export const getSerializedDashboardPeriod = (period: any) => ({
  rangeName: period?.rangeName || LAST_24_HOURS,
  start: period?.start,
  end: period?.end,
});

export const getDashboardDefaultPeriod = (config: any) =>
  Period(
    config?.defaultPeriod?.rangeName
      ? getSerializedDashboardPeriod(config.defaultPeriod)
      : getSerializedDashboardPeriod({ rangeName: LAST_24_HOURS }),
  );
