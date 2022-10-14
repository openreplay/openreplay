

const u8aFromHex = (hexString:string) =>
  Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)))

const is16BitHex = (maybeHex: string | undefined) =>
  maybeHex && maybeHex.length % 2 === 0 && !/[^a-fA-F0-9]/u.test(maybeHex)


function truncPadding(padded: Uint8Array): Uint8Array {
	let i = padded.length - 1
	for (; !padded[i] ;i--) {}
	return padded.subarray(0, i)
}

export function decryptSessionBytes(cypher: Uint8Array, keyString: string): Promise<Uint8Array> {
	if (keyString.length !== 64) {
		return Promise.reject("Wrong key string format")
	}
	const [hexKey, hexIV] = keyString.match(/.{8}/g)
	if (!is16BitHex(hexIV) || !is16BitHex(hexKey)) {
		return Promise.reject("Wrong key/iv pair")
	}
	const iv = u8aFromHex(hexIV)
	const byteKey = u8aFromHex(hexKey)
	return crypto.subtle.importKey("raw",byteKey, { name: "AES-CBC" }, false, ["decrypt"])
		.then(key => crypto.subtle.decrypt({ name: "AES-CBC", iv: iv}, key, cypher))
		.then(truncPadding)
}


