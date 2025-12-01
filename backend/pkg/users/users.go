package users

import (
	"errors"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"

	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/users/model"
)

type Users interface {
	GetByUserID(projID uint32, userId string) (*model.User, error)
	SearchUsers(projID uint32, req *model.SearchUsersRequest) ([]*model.SearchUsersResponse, error)
	UpdateUser(projID uint32, user *model.User) (*model.User, error)
	DeleteUser(projID uint32, userID uint32) (*model.User, error)
}

type usersImpl struct {
	log    logger.Logger
	chConn driver.Conn
}

func New(log logger.Logger, conn driver.Conn) (Users, error) {
	return &usersImpl{
		log:    log,
		chConn: conn,
	}, nil
}

func (u *usersImpl) GetByUserID(projID uint32, userId string) (*model.User, error) {
	// TODO: implement
	return nil, errors.New("not implemented")
}

func (u *usersImpl) SearchUsers(projID uint32, req *model.SearchUsersRequest) ([]*model.SearchUsersResponse, error) {
	// TODO: implement
	return nil, errors.New("not implemented")
}

func (u *usersImpl) UpdateUser(projID uint32, user *model.User) (*model.User, error) {
	// TODO: implement
	return nil, errors.New("not implemented")
}

func (u *usersImpl) DeleteUser(projID uint32, userID uint32) (*model.User, error) {
	// TODO: implement
	return nil, errors.New("not implemented")
}
