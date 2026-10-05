import ListWalker from '../../common/ListWalker';

type AnyMsg = { time: number; tp: number; [key: string]: any };

/**
 * Logs `TRIGGER:<name>_url:<value>` when playback passes watched messages;
 * external automation (e.g. video export) listens to these console lines.
 */
export default class HookManager extends ListWalker<AnyMsg> {
  watched: { [name: string]: { tp: number[]; attrKey: string } } = {};

  private watchedTypes: Set<number> = new Set();

  setTypes(mTypes: { tp: number; name: string; attrKey: string }[]) {
    mTypes.forEach(({ tp, name, attrKey }) => {
      if (this.watched[name]) {
        this.watched[name].tp.push(tp);
      } else {
        this.watched[name] = { tp: [tp], attrKey: attrKey };
      }
      this.watchedTypes.add(tp);
    });
  }

  append(msg: AnyMsg): void {
    if (this.watchedTypes.has(msg.tp)) {
      super.append(msg);
    }
  }

  moveReady(t: number): boolean {
    const msg = this.moveGetLast(t);
    if (!msg) {
      return false;
    }
    const eventName = Object.keys(this.watched).find((name) =>
      this.watched[name].tp.includes(msg.tp),
    );
    if (eventName) {
      console.log(
        `TRIGGER:${eventName}_url:${msg[this.watched[eventName].attrKey]}`,
      );
    } else {
      console.log(`TRIGGER:unknown`, msg);
    }
    return true;
  }
}
