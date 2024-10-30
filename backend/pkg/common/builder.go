package common

import (
	"context"
	"openreplay/backend/internal/config/common"
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
	Config      *common.Config
	Flaker      *flakeid.Flaker
	ObjStorage  objectstorage.ObjectStorage
	Auth        auth.Auth
	Log         logger.Logger
	Pgconn      pool.Pool
	workerID    int
	jwtSecret   string
	extraSecret string
}

// NewServiceBuilder initializes the ServicesBuilder with essential components (logger)
func NewServiceBuilder(log logger.Logger) *ServicesBuilder {
	return &ServicesBuilder{
		Log: log,
	}
}

// WithFlaker sets the Flaker component
func (b *ServicesBuilder) WithFlaker(workerID uint16) *ServicesBuilder {
	b.Flaker = flakeid.NewFlaker(workerID)
	return b
}

// WithObjectStorage sets the Object Storage component
func (b *ServicesBuilder) WithObjectStorage(config *objConfig.ObjectsConfig) *ServicesBuilder {
	objStore, err := store.NewStore(config)
	if err != nil {
		return nil
	}
	b.ObjStorage = objStore
	return b
}

// WithAuth sets the Auth component
func (b *ServicesBuilder) WithAuth(jwtSecret string, extraSecret ...string) *ServicesBuilder {
	b.jwtSecret = jwtSecret
	if len(extraSecret) > 0 {
		b.extraSecret = extraSecret[0]
	}
	b.Auth = auth.NewAuth(b.Log, "jwt_iat", b.jwtSecret, b.extraSecret, b.Pgconn)
	return b
}

// WithDatabase sets the database connection pool
func (b *ServicesBuilder) WithDatabase(url string) *ServicesBuilder {
	pgConn, err := pool.New(url)
	if err != nil {
		b.Log.Fatal(context.Background(), "can't init postgres connection: %s", err)
	}

	b.Pgconn = pgConn
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
