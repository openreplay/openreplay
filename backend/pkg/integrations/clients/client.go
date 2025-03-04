package clients

type Client interface {
	FetchSessionData(credentials interface{}, sessionID uint64) (interface{}, error)
}
