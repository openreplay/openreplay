import logger from 'App/logger';

function isChromium(item) {
  return ['Chromium', 'Google Chrome', 'NewBrowser'].includes(item.brand);
}
// @ts-ignore
const isChromeLike = navigator.userAgentData?.brands?.some(isChromium);

export function insertRule(
  sheet: { insertRule: (rule: string, index?: number) => void },
  msg: { rule: string; index: number },
) {
  /**
   * inserting -moz- styles in chrome-like browsers causes issues and warnings
   * changing them to -webkit- is usually fine because they're covered by native styles
   * and not inserting them will break sheet indexing
   * */
  if (msg.rule.includes('-moz-') && isChromeLike) {
    msg.rule = msg.rule.replace(/-moz-/g, '-webkit-');
  }
  try {
    sheet.insertRule(msg.rule, msg.index);
  } catch (e) {
    try {
      sheet.insertRule(msg.rule);
    } catch (e) {
      logger.warn('Cannot insert rule.', e, '\nmessage: ', msg);
    }
  }
}

export function deleteRule(
  sheet: { deleteRule: (index: number) => void },
  msg: { index: number },
) {
  try {
    sheet.deleteRule(msg.index);
  } catch (e) {
    logger.warn(e, msg);
  }
}
