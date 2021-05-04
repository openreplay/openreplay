package url

var METHODS = []string{ "GET", "HEAD", "POST" , "PUT" , "DELETE" , "CONNECT" , "OPTIONS" , "TRACE" , "PATCH" }

func EnsureMethod(method string) string {
	for _, m := range METHODS {
    if m == method {
      return method
    }
	}
	return ""
}