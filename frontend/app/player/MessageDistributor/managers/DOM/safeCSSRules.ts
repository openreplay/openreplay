import logger from 'App/logger';

export type { PostponedStyleSheet } from './VirtualDOM'

export function insertRule(sheet: CSSStyleSheet | PostponedStyleSheet, msg: { rule: string, index: number }) {
  try {
    sheet.insertRule(msg.rule, msg.index)
  } catch (e) {
    logger.warn(e, msg)
    try {
      sheet.insertRule(msg.rule, 0)
      logger.warn("Inserting rule into 0-index", e, msg)
    } catch (e) {
      logger.warn("Cannot insert rule.", e, msg)
    }
  }
}

export function deleteRule(sheet: CSSStyleSheet | PostponedStyleSheet, msg: { index: number }) {
  try {
    sheet.deleteRule(msg.index)
  } catch (e) {
    logger.warn(e, msg)
  }
}
