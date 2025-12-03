package env

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
		return hashHostname(String("HOSTNAME"))
	}
	return uint16(ip[2])<<8 + uint16(ip[3])
}
