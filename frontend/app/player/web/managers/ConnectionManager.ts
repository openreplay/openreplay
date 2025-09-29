import ListWalker from '../../common/ListWalker';
import { ConnectionInformation } from '../messages';

export default class ConnectionManager extends ListWalker<ConnectionInformation> {
  currentQuality = 5;
  currentTime = 0;

  moveReady = (t: number): number | null => {
    if (t < this.currentTime) {
      this.reset();
    }
    this.currentTime = t;
    const msg = this.moveGetLast(t);

    if (msg) {
      this.currentQuality = getNetworkQuality(msg.downlink, msg.type);
      return this.currentQuality;
    }
    return null;
  }
}

function getNetworkQuality(downlink: number, type: string): number {
  const dl = Number.isFinite(downlink)
    ? Math.max(0, Math.min(10, Number(downlink)))
    : 0;
  const t = (type || "").toLowerCase();

  const TYPE_SCORE: Record<string, number> = {
    "slow-2g": 0,
    "2g": 1,
    "3g": 2,
    "4g": 3,
    "5g": 4,
    // just in case we'll get them one day
    "wifi": 4,
    "ethernet": 4,
    "unknown": 0,
  };

  const dlScore = (dl / 10) * 5;
  const typeScore = TYPE_SCORE[t] ?? 0;

  const blended = 0.6 * dlScore + 0.4 * typeScore;
  return Math.max(0, Math.min(4, Math.round(blended)));
}
