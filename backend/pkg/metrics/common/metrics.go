package common

// DefaultDurationBuckets is a set of buckets from 5 milliseconds to 1000 seconds (16.6667 minutes)
var DefaultDurationBuckets = []float64{.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10, 25, 50, 100, 250, 500, 1000}

// DefaultSizeBuckets is a set of buckets from 1 byte to 1_000_000_000 bytes (~1 Gb)
var DefaultSizeBuckets = []float64{1, 10, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100_000, 250_000,
	500_000, 1_000_000, 10_000_000, 100_000_000, 1_000_000_000}

// DefaultBuckets is a set of buckets from 1 to 1_000_000 elements
var DefaultBuckets = []float64{1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10_000, 50_000, 100_000, 1_000_000}
