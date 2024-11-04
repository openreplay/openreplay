export default class LocalStorage {
  constructor(types) {
    this._types = types;
    this._state = {};
    Object.keys(types).forEach((k) => { this._state[ k ] = null; });
  }

  state() {
    Object.keys(this._types).forEach((k) => {
      const v = localStorage.getItem(k);
      this._state[ k ] = v;
      if (v !== null) {
        try {
          const p = new this._types[ k ](JSON.parse(v));
          this._state[ k ] = p;
        } catch (e) {
          localStorage.removeItem(k);
        }
      }
    });
    return this._state;
  }

  sync(state) {
    Object.keys(this._types).forEach((k) => {
      const v = state[ k ];
      if (v === null) {
        localStorage.removeItem(k);
        return;
      }
      if (this._state[ k ] !== v) {
        this._state[ k ] = v;
        localStorage.setItem(k, JSON.stringify(v));
      }
    });
  }
}
