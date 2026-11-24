import { debounce } from 'App/utils';

const heightKey = 'playerPanelHeight';

export const debounceUpdate = debounce((height: number) => {
  localStorage.setItem(heightKey, height.toString());
}, 500);

export const getDefaultPanelHeight = () => {
  const storageHeight = localStorage.getItem(heightKey);
  if (storageHeight) {
    const height = parseInt(storageHeight, 10);
    return height > window.innerHeight / 2 ? window.innerHeight / 2 : height;
  }
  return 300;
};
