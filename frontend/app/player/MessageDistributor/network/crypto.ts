
const u8aFromHex = (hexString:string) =>
  Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)))

const is16BitHex = (maybeHex: string | undefined) =>
  maybeHex && maybeHex.length % 2 === 0 && !/[^a-fA-F0-9]/u.test(maybeHex)

export function decryptSessionBytes(cypher: Uint8Array, keyString: string): Promise<Uint8Array> {
	if (keyString.length !== 64) {
		return Promise.reject("Wrong key string format")
	}
	const [hexKey, hexIV] = keyString.match(/.{32}/g)
	if (!is16BitHex(hexIV) || !is16BitHex(hexKey)) {
		return Promise.reject("Wrong key/iv pair")
	}
	const byteKey = u8aFromHex(hexKey)
	const iv = u8aFromHex(hexIV)

	return crypto.subtle.importKey("raw", byteKey, { name: "AES-CBC" }, false, ["decrypt"])
		.then(key => crypto.subtle.decrypt({ name: "AES-CBC", iv: iv}, key, cypher))
		.then((bArray: ArrayBuffer) => new Uint8Array(bArray)) //?? TS doesn not catch the `decrypt`` returning type
}


