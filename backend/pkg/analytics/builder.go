package analytics

//import (
//	"openreplay/backend/internal/config/analytics"
//	"openreplay/backend/pkg/common/api/auth"
//	"openreplay/backend/pkg/db/postgres/pool"
//	"openreplay/backend/pkg/flakeid"
//	"openreplay/backend/pkg/logger"
//	"openreplay/backend/pkg/objectstorage"
//	"openreplay/backend/pkg/objectstorage/store"
//)
//
//type ServicesBuilder struct {
//	Flaker     *flakeid.Flaker
//	ObjStorage objectstorage.ObjectStorage
//	Auth       auth.Auth
//}
//
//func NewServiceBuilder(log logger.Logger, cfg *analytics.Config, pgconn pool.Pool) (*ServicesBuilder, error) {
//	objStore, err := store.NewStore(&cfg.ObjectsConfig)
//	if err != nil {
//		return nil, err
//	}
//	flaker := flakeid.NewFlaker(cfg.WorkerID)
//	return &ServicesBuilder{
//		Flaker:     flaker,
//		ObjStorage: objStore,
//		Auth:       auth.NewAuth(log, cfg.JWTSecret, pgconn),
//	}, nil
//}
