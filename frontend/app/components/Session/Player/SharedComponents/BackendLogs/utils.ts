export interface UnifiedLog {
  key: string;
  timestamp: string;
  content: string;
  status: string;
}

export function processLog(log: any): UnifiedLog[] {
  if (isDatadogLog(log)) {
    return log.map(processDatadogLog);
  }
  if (isElasticLog(log)) {
    return log.map(processElasticLog);
  }
  if (isSentryLog(log)) {
    return log.map(processSentryLog);
  }
  if (isDynatraceLog(log)) {
    return log.map(processDynatraceLog);
  }
  throw new Error('Unknown log format');
}

function isDynatraceLog(log: any): boolean {
  return (
    Array.isArray(log) &&
    log[0].eventType === 'LOG' &&
    log[0].content &&
    log[0].status
  );
}

function isDatadogLog(log: any): boolean {
  return (
    log && log[0].attributes && typeof log[0].attributes.message === 'string'
  );
}

function isElasticLog(log: any): boolean {
  return log && log[0]._source && log[0]._source.message;
}

function isSentryLog(log: any): boolean {
  return log && 'id' in log[0] && 'message' in log[0] && 'title' in log[0];
}

function processDynatraceLog(log: any): UnifiedLog {
  const result = log;

  const key =
    result.additionalColumns?.trace_id?.[0] ||
    result.additionalColumns?.span_id?.[0] ||
    String(result.timestamp);

  const timestamp = new Date(result.timestamp).toISOString();

  let message = result.content || '';
  let level = result.status?.toLowerCase() || 'info';

  const contentPattern =
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+\|(\w+)\|.*?\| (.*)$/;
  const contentMatch = message.match(contentPattern);

  if (contentMatch) {
    level = contentMatch[1].toLowerCase();
    message = contentMatch[2];
  }

  return {
    key,
    timestamp,
    content: message,
    status: level,
  };
}

function processDatadogLog(log: any): UnifiedLog {
  const key = log.id || '';
  const timestamp = log.timestamp || log.attributes?.timestamp || '';
  const message = log.attributes?.message || '';
  const level = log.attributes?.status || 'info';
  return {
    key,
    timestamp,
    content: message,
    status: level.toUpperCase(),
  };
}

function processElasticLog(log: any): UnifiedLog {
  const key = log._id || '';
  const timestamp = log._source['@timestamp'] || '';
  const message = log._source.message || '';
  const level = getLevelFromElasticTags(log._source.level);
  return {
    key,
    timestamp,
    content: message,
    status: level,
  };
}

function getLevelFromElasticTags(tags: string[]): string {
  const levels = ['error', 'warning', 'info', 'debug'];
  for (const level of levels) {
    if (tags.includes(level.toLowerCase())) {
      return level;
    }
  }
  return 'info';
}

function processSentryLog(log: any): UnifiedLog {
  const key = log.id || log.eventID || '';
  const timestamp = log.dateCreated || 'N/A';
  const message = `${log.title}: \n ${log.message}`;
  const level = log.tags ? getLevelFromSentryTags(log.tags) : 'N/A';
  return {
    key,
    timestamp,
    content: message,
    status: level,
  };
}

function getLevelFromSentryTags(tags: any[]): string {
  for (const tag of tags) {
    if (tag.key === 'level') {
      return tag.value;
    }
  }
  return 'info';
}
