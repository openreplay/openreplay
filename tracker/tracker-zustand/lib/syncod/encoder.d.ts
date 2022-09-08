export default class Encoder {
    constructor(hash: any, slen?: number);
    _ref_str(str: any): any;
    _encode_prim(obj: any): any;
    _encode_obj(obj: any, ref?: any): any;
    _encode_term(obj: any): any;
    _encode_deep(obj: any, depth: any): any;
    encode(obj: any): any;
    commit(): {};
    clear(): void;
}
