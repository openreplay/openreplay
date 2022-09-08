"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chars_js_1 = require("./chars.js");
// @ts-ignore
// @ts-ignore
class Encoder {
    // @ts-ignore
    constructor(hash, slen = Infinity) {
        // @ts-ignore
        this._hash = hash;
        // @ts-ignore
        this._slen = slen;
        // @ts-ignore
        this._refmap = new Map();
        // @ts-ignore
        this._refset = new Set();
        // @ts-ignore
    }
    // @ts-ignore
    // @ts-ignore
    _ref_str(str) {
        // @ts-ignore
        if (str.length < this._slen && str.indexOf(chars_js_1.default.DEL) === -1) {
            // @ts-ignore
            return str;
            // @ts-ignore
        }
        // @ts-ignore
        let ref = this._refmap.get(str);
        // @ts-ignore
        if (ref === undefined) {
            // @ts-ignore
            ref = this._hash(str);
            // @ts-ignore
            this._refmap.set(str, ref);
            // @ts-ignore
        }
        // @ts-ignore
        return ref;
        // @ts-ignore
    }
    // @ts-ignore
    // @ts-ignore
    _encode_prim(obj) {
        // @ts-ignore
        switch (typeof obj) {
            // @ts-ignore
            case "undefined":
                // @ts-ignore
                return chars_js_1.default.UNDEF;
            // @ts-ignore
            case "boolean":
                // @ts-ignore
                return obj ? chars_js_1.default.TRUE : chars_js_1.default.FALSE;
            // @ts-ignore
            case "number":
                // @ts-ignore
                return chars_js_1.default.NUMBER + obj.toString();
            // @ts-ignore
            case "bigint":
                // @ts-ignore
                return chars_js_1.default.BIGINT + obj.toString();
            // @ts-ignore
            case "function":
                // @ts-ignore
                return chars_js_1.default.FUNCTION;
            // @ts-ignore
            case "string":
                // @ts-ignore
                return chars_js_1.default.STRING + this._ref_str(obj);
            // @ts-ignore
            case "symbol":
                // @ts-ignore
                return chars_js_1.default.SYMBOL + this._ref_str(obj.toString().slice(7, -1));
            // @ts-ignore
        }
        // @ts-ignore
        if (obj === null) {
            // @ts-ignore
            return chars_js_1.default.NULL;
            // @ts-ignore
        }
        // @ts-ignore
    }
    // @ts-ignore
    // @ts-ignore
    _encode_obj(obj, ref = this._refmap.get(obj)) {
        // @ts-ignore
        return (Array.isArray(obj) ? chars_js_1.default.ARRAY : chars_js_1.default.OBJECT) + ref;
        // @ts-ignore
    }
    // @ts-ignore
    // @ts-ignore
    _encode_term(obj) {
        // @ts-ignore
        return this._encode_prim(obj) || this._encode_obj(obj);
        // @ts-ignore
    }
    // @ts-ignore
    // @ts-ignore
    _encode_deep(obj, depth) {
        // @ts-ignore
        const enc = this._encode_prim(obj);
        // @ts-ignore
        if (enc !== undefined) {
            // @ts-ignore
            return enc;
            // @ts-ignore
        }
        // @ts-ignore
        const ref = this._refmap.get(obj);
        // @ts-ignore
        switch (typeof ref) {
            // @ts-ignore
            case "number":
                // @ts-ignore
                return (depth - ref).toString();
            // @ts-ignore
            case "string":
                // @ts-ignore
                return this._encode_obj(obj, ref);
            // @ts-ignore
        }
        // @ts-ignore
        this._refmap.set(obj, depth);
        // @ts-ignore
        const hash = this._hash(
        // @ts-ignore
        (Array.isArray(obj)
            // @ts-ignore
            ? obj.map(v => this._encode_deep(v, depth + 1))
            // @ts-ignore
            : Object.keys(obj)
                // @ts-ignore
                .sort()
                // @ts-ignore
                .map(
            // @ts-ignore
            k => 
            // @ts-ignore
            this._ref_str(k) + chars_js_1.default.DEL + this._encode_deep(obj[k], depth + 1)
            // @ts-ignore
            )
        // @ts-ignore
        ).join(chars_js_1.default.DEL)
        // @ts-ignore
        );
        // @ts-ignore
        this._refmap.set(obj, hash);
        // @ts-ignore
        return this._encode_obj(obj, hash);
        // @ts-ignore
    }
    // @ts-ignore
    // @ts-ignore
    encode(obj) {
        // @ts-ignore
        return this._encode_deep(obj, 0);
        // @ts-ignore
    }
    // @ts-ignore
    // @ts-ignore
    commit() {
        // @ts-ignore
        const dict = {};
        // @ts-ignore
        this._refmap.forEach((ref, obj) => {
            // @ts-ignore
            if (this._refset.has(ref)) {
                // @ts-ignore
                return;
                // @ts-ignore
            }
            // @ts-ignore
            this._refset.add(ref);
            // @ts-ignore
            if (typeof obj !== "string") {
                // @ts-ignore
                obj = (Array.isArray(obj)
                    // @ts-ignore
                    ? obj.map(v => this._encode_term(v))
                    // @ts-ignore
                    : Object.keys(obj).map(
                    // @ts-ignore
                    k => this._ref_str(k) + chars_js_1.default.DEL + this._encode_term(obj[k])
                    // @ts-ignore
                    )
                // @ts-ignore
                ).join(chars_js_1.default.DEL);
                // @ts-ignore
            }
            // @ts-ignore
            dict[ref] = obj;
            // @ts-ignore
        });
        // @ts-ignore
        this._refmap.clear();
        // @ts-ignore
        return dict;
        // @ts-ignore
    }
    // @ts-ignore
    // @ts-ignore
    clear() {
        // @ts-ignore
        this._refmap.clear();
        // @ts-ignore
        this._refset.clear();
        // @ts-ignore
    }
}
exports.default = Encoder;
// @ts-ignore
