export const INDEXES = {
  POPUP_GUIDE_BG: 99998,
  POPUP_GUIDE_BTN: 99999,
}

export const getHighest = () => {
  const allIndexes = Object.values(INDEXES)
  return allIndexes[allIndexes.length - 1] + 1
}
