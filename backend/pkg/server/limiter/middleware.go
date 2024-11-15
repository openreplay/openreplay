package limiter

import (
	"net/http"
	"openreplay/backend/pkg/server/user"
)

func (rl *UserRateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userContext := r.Context().Value("userData")
		if userContext == nil {
			next.ServeHTTP(w, r)
			return
		}
		authUser := userContext.(*user.User)
		rl := rl.GetRateLimiter(authUser.ID)

		if !rl.Allow() {
			http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}
