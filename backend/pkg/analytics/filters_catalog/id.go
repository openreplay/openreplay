package filters_catalog

import (
	"crypto/md5"
	"math/big"
)

// StringToID mirrors api/chalicelib/utils/helper.py:string_to_id —
// MD5 of UTF-8 bytes interpreted as big-endian unsigned integer, rendered as decimal.
func StringToID(s string) string {
	sum := md5.Sum([]byte(s))
	z := new(big.Int).SetBytes(sum[:])
	return z.String()
}
