package postgres

import "strings"

var ilikeReplacer = strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)

// EscapeILIKE escapes LIKE/ILIKE pattern metacharacters; use with ESCAPE '\' in the query.
func EscapeILIKE(s string) string {
	return ilikeReplacer.Replace(s)
}
