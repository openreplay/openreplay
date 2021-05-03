package uaparser

import "net/http"

func (parser *UAParser) ParseFromHTTPRequest(r *http.Request) *UA {
	str := r.Header.Get("User-Agent")
	return parser.Parse(str)
}
