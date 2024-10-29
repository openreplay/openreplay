package common

import (
	"errors"
	objConfig "openreplay/backend/internal/config/objectstorage"
	"openreplay/backend/pkg/common/api/auth"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/flakeid"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
	"openreplay/backend/pkg/objectstorage/store"
)

// ServicesBuilder struct to hold service components
type ServicesBuilder struct {
	flaker      *flakeid.Flaker
	objStorage  objectstorage.ObjectStorage
	Auth        auth.Auth
	log         logger.Logger
	pgconn      pool.Pool
	workerID    int
	jwtSecret   string
	extraSecret string
}

// NewServiceBuilder initializes the ServicesBuilder with essential components (logger)
func NewServiceBuilder(log logger.Logger) *ServicesBuilder {
	return &ServicesBuilder{
		log: log,
	}
}

// WithFlaker sets the Flaker component
func (b *ServicesBuilder) WithFlaker(flaker *flakeid.Flaker) *ServicesBuilder {
	b.flaker = flaker
	return b
}

// WithObjectStorage sets the Object Storage component
func (b *ServicesBuilder) WithObjectStorage(config *objConfig.ObjectsConfig) *ServicesBuilder {
	objStore, err := store.NewStore(config)
	if err != nil {
		return nil
	}
	b.objStorage = objStore
	return b
}

// WithAuth sets the Auth component
func (b *ServicesBuilder) WithAuth(auth auth.Auth) *ServicesBuilder {
	b.Auth = auth
	return b
}

// WithDatabase sets the database connection pool (Postgres pool.Pool)
func (b *ServicesBuilder) WithDatabase(pgconn pool.Pool) *ServicesBuilder {
	b.pgconn = pgconn
	return b
}

// WithWorkerID sets the WorkerID for Flaker
func (b *ServicesBuilder) WithWorkerID(workerID int) *ServicesBuilder {
	b.workerID = workerID
	return b
}

// WithJWTSecret sets the JWT and optional extra secret for Auth
func (b *ServicesBuilder) WithJWTSecret(jwtSecret string, extraSecret ...string) *ServicesBuilder {
	b.jwtSecret = jwtSecret
	if len(extraSecret) > 0 {
		b.extraSecret = extraSecret[0]
	}
	return b
}

// Build finalizes the service setup and returns an instance of ServicesBuilder with all components
func (b *ServicesBuilder) Build() (*ServicesBuilder, error) {
	// Initialize default components if they aren't provided
	// Check if database pool is provided
	if b.pgconn == nil {
		return nil, errors.New("database connection pool is required")
	}

	// Flaker
	if b.flaker == nil {
		b.flaker = flakeid.NewFlaker(uint16(b.workerID))
	}

	// Auth
	if b.Auth == nil {
		if b.jwtSecret == "" {
			return nil, errors.New("JWT secret is required")
		}
		b.Auth = auth.NewAuth(b.log, "jwt_iat", b.jwtSecret, b.extraSecret, b.pgconn)
	}

	// Return the fully constructed service
	return b, nil
}
