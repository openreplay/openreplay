import _ from "./chars.js";

export default class Decoder {
  _dict: Map<any, any>;
  constructor() {
    this._dict = new Map();
  }

  set(ref, enc) {
    this._dict.set(ref, enc);
  }

  assign(dict) {
    for (let ref in dict) {
      this._dict.set(ref, dict[ref]);
    }
  }

  clear() {
    this._dict.clear();
  }

  _unref_str(str) {
    let s = this._dict.get(str);
    if (s !== undefined) {
      return s;
    }
    return str;
  }

  decode(enc) {
    const p = enc[0],
      b = enc.slice(1);
    switch (p) {
      case _.UNDEF:
        return undefined;
      case _.TRUE:
        return true;
      case _.FALSE:
        return false;
      case _.FUNCTION:
        return Function.prototype;
      case _.NUMBER:
        return parseFloat(b);
      case _.BIGINT:
        return BigInt(b);
      case _.STRING:
        return this._unref_str(b);
      case _.SYMBOL:
        return Symbol(this._unref_str(b));
      case _.NULL:
        return null;
    }
    const unref = this._dict.get(b);
    if (unref === undefined) {
      throw "index missing code";
    }
    if (typeof unref === "object") {
      return unref;
    }
    const args = unref.length === 0 ? [] : unref.split(_.DEL);
    switch (p) {
      case _.ARRAY:
        this._dict.set(b, args);
        for (let i = 0; i < args.length; i++) {
          args[i] = this.decode(args[i]);
        }
        return args;
      case _.OBJECT:
        const obj = {};
        this._dict.set(b, obj);
        for (let i = 0; i < args.length; i += 2) {
          obj[this._unref_str(args[i])] = this.decode(args[i + 1]);
        }
        return obj;
    }
    throw "unrecognized prefix";
  }
}
