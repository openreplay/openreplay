import { numberWithCommas } from 'App/utils';

/* Legacy palettes, now read from the kit's chart tokens so every chart follows the theme.
   Getters: the tokens change with light/dark, so each read takes the current values. */
const token = (name) =>
  typeof document === 'undefined'
    ? ''
    : getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const series = () =>
  Array.from({ length: 8 }, (_, i) => token(`--m-chart-${i + 1}`));

const countView = (count) => {
  const isMoreThanK = count >= 1000;
  return numberWithCommas(isMoreThanK ? `${Math.trunc(count / 1000)}k` : count);
};

export default {
  get colors() {
    return series();
  },
  get compareColors() {
    return series();
  },
  get safeColors() {
    return series();
  },
  tickFormatter: (val) => `${countView(val)}`,
};
