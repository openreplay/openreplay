package storage

import "github.com/prometheus/client_golang/prometheus"

func RecordSessionSize(fileSize float64, fileType string) {
	storageSessionSize.(prometheus.ExemplarObserver).ObserveWithExemplar(
		fileSize,
		map[string]string{"file_type": fileType},
	)
}

func IncreaseStorageTotalSessions() {
	storageTotalSessions.Inc()
}

func RecordSessionReadDuration(durMillis float64, fileType string) {
	storageSessionReadDuration.(prometheus.ExemplarObserver).ObserveWithExemplar(
		durMillis/1000.0,
		map[string]string{"file_type": fileType},
	)
}

func RecordSessionSortDuration(durMillis float64, fileType string) {
	storageSessionSortDuration.(prometheus.ExemplarObserver).ObserveWithExemplar(
		durMillis/1000.0,
		map[string]string{"file_type": fileType},
	)
}

func RecordSessionEncodeDuration(durMillis float64, fileType string) {
	storageSessionEncodeDuration.(prometheus.ExemplarObserver).ObserveWithExemplar(
		durMillis/1000.0,
		map[string]string{"file_type": fileType},
	)
}

func RecordSessionCompressDuration(durMillis float64, fileType string) {
	storageSessionCompressDuration.(prometheus.ExemplarObserver).ObserveWithExemplar(
		durMillis/1000.0,
		map[string]string{"file_type": fileType},
	)
}

func RecordSessionUploadDuration(durMillis float64, fileType string) {
	storageSessionUploadDuration.(prometheus.ExemplarObserver).ObserveWithExemplar(
		durMillis/1000.0,
		map[string]string{"file_type": fileType},
	)
}
