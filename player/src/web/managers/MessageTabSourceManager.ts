interface TabSegment {
  start: number;
  /** exclusive, except for the last segment */
  end: number;
  tabId: string;
}

/** Which tab produced the DOM messages at a given time, built incrementally while loading. */
export default class MessageTabSourceManager {
  segments: TabSegment[] = [];

  private current: TabSegment | null = null;

  /** Messages are expected in time order. */
  processMessage = (msg: { tabId: string; time: number }) => {
    if (!msg.tabId) return;
    const current = this.current;
    if (current && current.tabId === msg.tabId) {
      current.end = Math.max(current.end, msg.time + 1);
      return;
    }
    if (current) {
      current.end = msg.time;
    }
    this.current = { start: msg.time, end: msg.time + 1, tabId: msg.tabId };
    this.segments.push(this.current);
  };

  processMessages = (messages: { tabId: string; time: number }[]) => {
    messages.forEach(this.processMessage);
  };

  findTab = (time: number) => {
    const { segments } = this;
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      const isLast = i === segments.length - 1;
      // at a switch time the new tab wins
      if (s.start <= time && (time < s.end || (isLast && time <= s.end))) {
        return s.tabId;
      }
    }
    return null;
  };
}
