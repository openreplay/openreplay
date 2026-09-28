const crypto = require('crypto');

// Mirrors backend/pkg/token/tokenizer.go: "<id36>.<delay36>.<exp36>.<base58(hmac-sha256)>"

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const B36 = '0123456789abcdefghijklmnopqrstuvwxyz';
const EXPIRY_GRACE_MS = 30000;
const MAX_TOKEN_LENGTH = 128;

function base58Decode(str) {
    let n = 0n;
    for (const ch of str) {
        const d = B58.indexOf(ch);
        if (d < 0) {
            throw new Error('wrong token sign');
        }
        n = n * 58n + BigInt(d);
    }
    let hex = n === 0n ? '' : n.toString(16);
    if (hex.length % 2) {
        hex = '0' + hex;
    }
    let zeros = 0;
    while (zeros < str.length && str[zeros] === '1') {
        zeros++;
    }
    return Buffer.concat([Buffer.alloc(zeros), Buffer.from(hex, 'hex')]);
}

function base36ToBigInt(str) {
    let neg = false;
    if (str.startsWith('-')) {
        neg = true;
        str = str.substring(1);
    }
    if (str.length === 0) {
        throw new Error('wrong token format');
    }
    let n = 0n;
    for (const ch of str.toLowerCase()) {
        const d = B36.indexOf(ch);
        if (d < 0) {
            throw new Error('wrong token format');
        }
        n = n * 36n + BigInt(d);
    }
    return neg ? -n : n;
}

function parse(token, secret) {
    if (typeof token !== 'string' || token.length > MAX_TOKEN_LENGTH) {
        throw new Error('wrong token format');
    }
    const parts = token.split('.');
    if (parts.length !== 4) {
        throw new Error('wrong token format');
    }
    const body = parts.slice(0, 3).join('.');
    const expected = crypto.createHmac('sha256', secret).update(body).digest();
    const actual = base58Decode(parts[3]);
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
        throw new Error('wrong token sign');
    }
    const id = base36ToBigInt(parts[0]);
    if (id < 0n || id > 0xFFFFFFFFFFFFFFFFn) {
        throw new Error('wrong token format');
    }
    const expTime = Number(base36ToBigInt(parts[2]));
    if (expTime + EXPIRY_GRACE_MS <= Date.now()) {
        throw new Error('token expired');
    }
    return {sessionId: id.toString(), expTime};
}

module.exports = {parse};
