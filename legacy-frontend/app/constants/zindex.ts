export const INDEXES = {
  PLAYER_REQUEST_WINDOW: 10,
  BUG_REPORT_PICKER: 19,
  BUG_REPORT: 20,
  HEADER: 99,
  POPUP_GUIDE_BG: 99997,
  POPUP_GUIDE_BTN: 99998,
  TOOLTIP: 99999,
};

export const getHighest = () => {
  const allIndexes = Object.values(INDEXES);
  return allIndexes[allIndexes.length - 1] + 1;
};
