import logger from 'App/logger';

export function insertRule(
  sheet: { insertRule: (rule: string, index: number) => void },
  msg: { rule: string, index: number }
) {
  // we don't really need this anymore I believe
  if (msg.rule.includes('-moz-') || msg.rule.includes('-ms-')) {
    return
  }

  try {
    sheet.insertRule(msg.rule, msg.index)
  } catch (e) {
    logger.warn(e, msg)
    try {
      sheet.insertRule(msg.rule, 0) // TODO: index renumeration in case of subsequent rule deletion
      logger.warn("Inserting rule into 0-index", e, msg)
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
