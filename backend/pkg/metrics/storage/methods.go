package storage

func RecordSessionSize(fileSize float64, fileType string) {
	storageSessionSize.WithLabelValues(fileType).Observe(fileSize)
}

func IncreaseStorageTotalSessions() {
	storageTotalSessions.Inc()
}

func RecordSessionReadDuration(durMillis float64, fileType string) {
	storageSessionReadDuration.WithLabelValues(fileType).Observe(durMillis / 1000.0)
}

func RecordSessionSortDuration(durMillis float64, fileType string) {
	storageSessionSortDuration.WithLabelValues(fileType).Observe(durMillis / 1000.0)
}

func RecordSessionEncodeDuration(durMillis float64, fileType string) {
	storageSessionEncodeDuration.WithLabelValues(fileType).Observe(durMillis / 1000.0)
}

func RecordSessionCompressDuration(durMillis float64, fileType string) {
	storageSessionCompressDuration.WithLabelValues(fileType).Observe(durMillis / 1000.0)
}

func RecordSessionUploadDuration(durMillis float64, fileType string) {
	storageSessionUploadDuration.WithLabelValues(fileType).Observe(durMillis / 1000.0)
}
