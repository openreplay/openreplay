import { debounce } from 'App/utils';

const heightKey = 'playerPanelHeight';

export const debounceUpdate = debounce((height: number) => {
  localStorage.setItem(heightKey, height.toString());
}, 500);

export const getDefaultPanelHeight = () => {
  const storageHeight = localStorage.getItem(heightKey);
  const height = storageHeight ? parseInt(storageHeight, 10) : NaN;
  if (Number.isFinite(height) && height > 0)
    return Math.min(height, window.innerHeight / 2);
  return 300;
};
