import logger from 'App/logger';

export function insertRule(
  sheet: { insertRule: (rule: string, index?: number) => void },
  msg: { rule: string, index: number }
) {

  try {
    sheet.insertRule(msg.rule, msg.index)
  } catch (e) {
    try {
      sheet.insertRule(msg.rule)
    } catch (e) {
      logger.warn("Cannot insert rule.", e, msg)
    }
  }
}

export function deleteRule(
  sheet: { deleteRule: (index: number) => void },
  msg: { index: number }
) {
  try {
    sheet.deleteRule(msg.index)
  } catch (e) {
    logger.warn(e, msg)
  }
}
