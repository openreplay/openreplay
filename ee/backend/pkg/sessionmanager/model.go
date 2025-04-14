package sessionmanager

type SortOrder bool

const (
	Asc  SortOrder = true
	Desc SortOrder = false
)

type FilterType string

const (
	UserID          FilterType = "userId"
	UserAnonymousID            = "userAnonymousId"
	UserOS                     = "userOs"
	UserBrowser                = "userBrowser"
	UserDevice                 = "userDevice"
	UserPlatform               = "platform"
	UserCountry                = "userCountry"
	UserState                  = "userState"
	UserCity                   = "userCity"
	Metadata                   = "metadata"
)

type FilterOperator bool

const (
	Is       FilterOperator = true
	Contains FilterOperator = false
)

type Filter struct {
	Type     FilterType
	Value    []string
	Operator FilterOperator
	Source   string // for metadata only
}
