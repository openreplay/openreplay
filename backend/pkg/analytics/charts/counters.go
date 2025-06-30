package charts

func getStepSize(startTimestamp, endTimestamp int64, density int, decimal bool, factor int) float64 {
	factorInt64 := int64(factor)
	stepSize := (endTimestamp / factorInt64) - (startTimestamp / factorInt64)

	if density <= 1 {
		return float64(stepSize)
	}

	if decimal {
		return float64(stepSize) / float64(density)
	}

	return float64(stepSize / int64(density-1))
}
