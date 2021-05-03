package main

func decodeProjectID(projectID uint64) uint64 {
	if projectID < 0x10000000000000 || projectID >= 0x20000000000000 {
		return 0
	}
	projectID = (projectID - 0x10000000000000) * 4212451012670231 & 0xfffffffffffff
	if projectID > 0xffffffff {
		return 0
	}
	return projectID
}
