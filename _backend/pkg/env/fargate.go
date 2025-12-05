package env

import (
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"os"
)

type fargateTaskContainer struct {
	Networks []struct {
		IPv4Addresses []string
	}
}

func fargateTaskIP() (net.IP, error) {
	res, err := http.Get(os.Getenv("ECS_CONTAINER_METADATA_URI"))
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	container := fargateTaskContainer{}
	if err := json.NewDecoder(res.Body).Decode(&container); err != nil {
		return nil, err
	}
	if len(container.Networks) != 1 {
		return nil, errors.New("container should have exactly one network")
	}
	network := container.Networks[0]
	if len(network.IPv4Addresses) != 1 {
		return nil, errors.New("container should have exactly one IPv4")
	}

	ip := net.ParseIP(network.IPv4Addresses[0]).To4()
	if ip == nil {
		return nil, errors.New("invalid ip address")
	}
	return ip, nil
}
