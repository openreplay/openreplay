export interface UnifiedLog {
  key: string;
  timestamp: string;
  content: string;
  status: string;
}

export function processLog(log: any): UnifiedLog {
  if (isDatadogLog(log)) {
    return processDatadogLog(log);
  } else if (isElasticLog(log)) {
    return processElasticLog(log);
  } else if (isSentryLog(log)) {
    return processSentryLog(log);
  } else {
    throw new Error("Unknown log format");
  }
}

function isDatadogLog(log: any): boolean {
  return log && log.content && typeof log.content.message === 'string';
}

function isElasticLog(log: any): boolean {
  return log && log._source && log._source.message;
}

function isSentryLog(log: any): boolean {
  return log && log.eventID && Array.isArray(log.tags);
}

function processDatadogLog(log: any): UnifiedLog {
  const key = log.content.attributes?.id || log.id || '';
  const timestamp = log.content.timestamp || log.content.attributes?.timestamp || '';
  const message = log.content.message || '';
  const level = log.content.attributes?.level || 'info';
  return { key, timestamp, content: message, status: level };
}

function processElasticLog(log: any): UnifiedLog {
  const key = log._id || '';
  const timestamp = log._source.timestamp || log._source.utc_time || '';
  const message = log._source.message || '';
  const level = getLevelFromElasticTags(log._source.tags);
  return { key, timestamp, content: message, status: level };
}

function getLevelFromElasticTags(tags: string[]): string {
  const levels = ['error', 'warning', 'info', 'debug'];
  for (const level of levels) {
    if (tags.includes(level)) {
      return level;
    }
  }
  return 'info';
}

function processSentryLog(log: any): UnifiedLog {
  const key = log.id || log.eventID || '';
  const timestamp = log.dateCreated || '';
  const message = log.message || log.title || log.culprit || '';
  const level = getLevelFromSentryTags(log.tags);
  return { key, timestamp, content: message, status: level };
}

function getLevelFromSentryTags(tags: any[]): string {
  for (const tag of tags) {
    if (tag.key === 'level') {
      return tag.value;
    }
  }
  return 'info';
}
