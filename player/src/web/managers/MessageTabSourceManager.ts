interface TabSegment {
  start: number;
  end?: number;
  tabId: string;
}

export default class MessageTabSourceManager {
  segments: TabSegment[] = [];

  currentTab = '';
  processMessages = (messages: { tabId: string; time: number }[]) => {
    this.currentTab = messages[0].tabId;
    let currSegment: TabSegment = {
      start: messages[0].time,
      end: undefined,
      tabId: messages[0].tabId,
    };
    messages.slice(1).forEach((msg, i) => {
      if (msg.tabId !== this.currentTab) {
        currSegment.end = msg.time;
        this.segments.push(currSegment);
        this.currentTab = msg.tabId;
        currSegment = { start: msg.time, tabId: msg.tabId };
      }
      if (i === messages.length - 2) {
        currSegment.end = msg.time + 1;
        this.segments.push(currSegment);
      }
    });
  };

  findTab = (time: number) => {
    const segment = this.segments.find(
      (s) => s.start <= time && (s.end ? s.end >= time : true),
    );
    return segment ? segment.tabId : null;
  };
}
