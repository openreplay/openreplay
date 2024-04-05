import _ from "./chars.js";

type HashFunction = (str: string) => string;

export default class Encoder {
  _hash: HashFunction;
  _slen: number;
  _refmap: Map<any, any>;
  _refset: Set<any>;

  constructor(hash: HashFunction, slen = Infinity) {
    this._hash = hash;
    this._slen = slen;
    this._refmap = new Map();
    this._refset = new Set();
  }

  _ref_str(str) {
    if (str.length < this._slen && !str.includes(_.DEL)) {
      return str;
    }
    let ref = this._refmap.get(str);
    if (ref === undefined) {
      ref = this._hash(str);
      this._refmap.set(str, ref);
    }
    return ref;
  }

  _encode_prim(obj) {
    const type = typeof obj;
    switch (type) {
      case "undefined":
        return _.UNDEF;
      case "boolean":
        return obj ? _.TRUE : _.FALSE;
      case "number":
        return _.NUMBER + obj.toString();
      case "bigint":
        return _.BIGINT + obj.toString();
      case "function":
        return _.FUNCTION;
      case "string":
        return _.STRING + this._ref_str(obj);
      case "symbol":
        return _.SYMBOL + this._ref_str(obj.toString().slice(7, -1));
    }
    if (obj === null) {
      return _.NULL;
    }
  }

  _encode_obj(obj, ref = this._refmap.get(obj)) {
    return (Array.isArray(obj) ? _.ARRAY : _.OBJECT) + ref;
  }

  _encode_term(obj) {
    return this._encode_prim(obj) || this._encode_obj(obj);
  }

  _encode_deep(obj, depth) {
    const enc = this._encode_prim(obj);
    if (enc !== undefined) {
      return enc;
    }
    const ref = this._refmap.get(obj);
    switch (typeof ref) {
      case "number":
        return (depth - ref).toString();
      case "string":
        return this._encode_obj(obj, ref);
    }
    this._refmap.set(obj, depth);

    const hash = this._hash(
      (Array.isArray(obj)
        ? obj.map(v => this._encode_deep(v, depth + 1))
        : Object.keys(obj)
            .sort()
            .map(
              k =>
                this._ref_str(k) + _.DEL + this._encode_deep(obj[k], depth + 1)
            )
      ).join(_.DEL)
    );

    this._refmap.set(obj, hash);
    return this._encode_obj(obj, hash);
  }

  encode(obj) {
    return this._encode_deep(obj, 0);
  }

  commit() {
    const dict = {};
    this._refmap.forEach((ref, obj) => {
      if (this._refset.has(ref)) {
        return;
      }
      this._refset.add(ref);
      if (typeof obj !== "string") {
        obj = (Array.isArray(obj)
          ? obj.map(v => this._encode_term(v))
          : Object.keys(obj).map(
              k => this._ref_str(k) + _.DEL + this._encode_term(obj[k])
            )
        ).join(_.DEL);
      }
      dict[ref] = obj;
    });
    this._refmap.clear();
    return dict;
  }

  clear() {
    this._refmap.clear();
    this._refset.clear();
  }
}
