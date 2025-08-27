//go:build !ee

package charts

func getMainEventsTable(timestamp uint64) string {
	return "product_analytics.events"
}

func getMainSessionsTable(timestamp uint64) string {
	return "experimental.sessions"
}
