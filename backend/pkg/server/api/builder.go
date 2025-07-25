package api

type ServiceBuilder interface {
	Middlewares() []RouterMiddleware
	Handlers() []Handlers
}
