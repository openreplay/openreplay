package url

var METHODS = []string{"GET", "HEAD", "POST", "PUT", "DELETE", "CONNECT", "OPTIONS", "TRACE", "PATCH"}
var TYPES = []string{"other", "script", "stylesheet", "fetch", "img", "media"}

func EnsureMethod(method string) string {
	for _, m := range METHODS {
		if m == method {
			return method
		}
	}
	return ""
}

func EnsureType(tp string) string {
	for _, t := range TYPES {
		if t == tp {
			return tp
		}
	}
	return ""
}
