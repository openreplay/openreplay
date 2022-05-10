package env

import (
	"log"
)

func hashHostname(hostname string) uint16 {
	var h uint16
	for i, b := range hostname {
		h += uint16(i+1) * uint16(b)
	}
	return h
}

func WorkerID() uint16 {
	ip, err := fargateTaskIP()
	if err != nil {
		log.Printf("Warning: unable to retrieve Fargate Task IP: %v; trying to use HOSTNAME instead", err)
		return hashHostname(String("HOSTNAME"))
	}
	return uint16(ip[2])<<8 + uint16(ip[3])
}
