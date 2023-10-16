package connector

type Database interface {
	InsertEvents(batch []map[string]string) error
	InsertSessions(batch []map[string]string) error
	Close() error
}
