const crypto = require('crypto');
const {logger} = require('./logger');

// Base58 alphabet used by the Go backend (btcsuite/btcutil/base58, Bitcoin alphabet)
const B58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(buffer) {
    let x = BigInt('0x' + (buffer.toString('hex') || '0'));
    const base = 58n;
    let result = '';
    while (x > 0n) {
        result = B58_ALPHABET[Number(x % base)] + result;
        x /= base;
    }
    // Preserve leading zero bytes as leading '1's, same as the Go encoder
    for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
        result = '1' + result;
    }
    return result;
}

/**
 * same as /ingest authorization check in backend/pkg/token/tokenizer.go (Parse):
 */
function verifySessionToken(token) {
    const secret = process.env.TOKEN_SECRET;
    if (!secret) {
        logger.error('TOKEN_SECRET is not set, cannot verify session token');
        return false;
    }
    if (!token || typeof token !== 'string') {
        logger.debug('session token: missing');
        return false;
    }
    const parts = token.split('.');
    if (parts.length !== 4) {
        logger.debug('session token: wrong format');
        return false;
    }
    const body = parts.slice(0, -1).join('.');
    const providedSign = parts[parts.length - 1];
    const expectedSign = base58Encode(crypto.createHmac('sha256', secret).update(body).digest());
    if (providedSign.length !== expectedSign.length ||
        !crypto.timingSafeEqual(Buffer.from(providedSign), Buffer.from(expectedSign))) {
        logger.debug('session token: wrong signature');
        return false;
    }
    const expTime = parseInt(parts[2], 36);
    if (Number.isNaN(expTime)) {
        logger.debug('session token: invalid expiration');
        return false;
    }
    const now = Date.now();
    // Expired more than 30s ago -> reject; within the grace window -> still accepted
    if (expTime <= now && expTime + 30000 <= now) {
        logger.debug('session token: expired');
        return false;
    }
    return true;
}

module.exports = {verifySessionToken};
