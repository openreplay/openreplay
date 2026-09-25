import ListWalker from '../../common/ListWalker';
import { ConnectionInformation } from '../messages';

const DEFAULT_QUALITY = 4;

export default class ConnectionManager extends ListWalker<ConnectionInformation> {
  currentQuality = DEFAULT_QUALITY;

  private reportedItem: ConnectionInformation | null | undefined = undefined;

  /**
   * @returns quality (0-4) when the current connection item changed
   * (the default one when moved before the first item), null otherwise
   */
  moveReady = (t: number): number | null => {
    this.moveGetLast(t);
    const item = this.current;
    if (item === this.reportedItem) {
      return null;
    }
    this.reportedItem = item;
    this.currentQuality = item
      ? getNetworkQuality(item.downlink, item.type)
      : DEFAULT_QUALITY;
    return this.currentQuality;
  };
}

/** @param downlink kbps, as sent by the tracker (navigator.connection.downlink * 1000) */
function getNetworkQuality(downlink: number, type: string): number {
  const mbps = Number.isFinite(downlink) ? Number(downlink) / 1000 : 0;
  const dl = Math.max(0, Math.min(10, mbps));
  const t = (type || '').toLowerCase();

  const TYPE_SCORE: Record<string, number> = {
    'slow-2g': 0,
    '2g': 1,
    '3g': 2,
    '4g': 3,
    '5g': 4,
    // just in case we'll get them one day
    wifi: 4,
    ethernet: 4,
    unknown: 0,
  };

  const dlScore = (dl / 10) * 5;
  const typeScore = TYPE_SCORE[t] ?? 0;

  const blended = 0.6 * dlScore + 0.4 * typeScore;
  return Math.max(0, Math.min(4, Math.round(blended)));
}
