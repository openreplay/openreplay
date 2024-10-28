export interface UnifiedLog {
  key: string;
  timestamp: string;
  content: string;
  status: string;
}

export function processLog(log: any): UnifiedLog[] {
  if (isDatadogLog(log)) {
    return log.data.map(processDatadogLog);
  } else if (isElasticLog(log)) {
    return processElasticLog(log);
  } else if (isSentryLog(log)) {
    return processSentryLog(log);
  } else if (isDynatraceLog(log)) {
    return processDynatraceLog(log);
  } else {
    throw new Error("Unknown log format");
  }
}

function isDynatraceLog(log: any): boolean {
  return (
    log &&
    log.results &&
    Array.isArray(log.results) &&
    log.results.length > 0 &&
    log.results[0].eventType === "LOG"
  );
}

function isDatadogLog(log: any): boolean {
  return log.data && log.data[0].attributes && typeof log.data[0].attributes.message === 'string';
}

function isElasticLog(log: any): boolean {
  return log && log._source && log._source.message;
}

function isSentryLog(log: any): boolean {
  return log && log.eventID && Array.isArray(log.tags);
}

function processDynatraceLog(log: any): UnifiedLog {
  const result = log.results[0];

  const key =
    result.additionalColumns?.["trace_id"]?.[0] ||
    result.additionalColumns?.["span_id"]?.[0] ||
    String(result.timestamp);

  const timestamp = new Date(result.timestamp).toISOString();

  let message = result.content || "";
  let level = result.status?.toLowerCase() || "info";

  const contentPattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+\|(\w+)\|.*?\| (.*)$/;
  const contentMatch = message.match(contentPattern);

  if (contentMatch) {
    level = contentMatch[1].toLowerCase();
    message = contentMatch[2];
  }

  return { key, timestamp, content: message, status: level };
}

function processDatadogLog(log: any): UnifiedLog {
  const key = log.id || '';
  const timestamp = log.timestamp || log.attributes?.timestamp || '';
  const message = log.attributes?.message || '';
  const level = log.attributes?.status || 'info';
  return { key, timestamp, content: message, status: level.toUpperCase() };
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
