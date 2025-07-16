import ListWalker from 'Player/common/ListWalker';

type AnyMsg = { time: number; tp: number; [key: string]: any };

// pathname trigger, clicks ?
export default class HookManager extends ListWalker<AnyMsg> {
  watched: { [name: string]: { tp: number[]; attrKey: string } } = {};

  setTypes(mTypes: { tp: number; name: string; attrKey: string }[]) {
    mTypes.forEach(({ tp, name, attrKey }) => {
      if (this.watched[name]) {
        this.watched[name].tp.push(tp);
      } else {
        this.watched[name] = { tp: [tp], attrKey: attrKey };
      }
    });
  }

  append(msg: AnyMsg): void {
    const watchedTypes = Object.values(this.watched).flatMap((w) => w.tp);
    if (watchedTypes.includes(msg.tp)) {
      super.append(msg);
    }
  }

  moveReady(t: number): Promise<boolean> {
    const msg = this.moveGetLast(t);

    if (msg) {
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
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }
}
