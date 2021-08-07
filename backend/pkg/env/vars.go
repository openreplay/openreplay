package env

import (
	"log"
	"os"
	"strconv"
)

func String(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalln(key + " is missing")
	}
	return v
}

func StringOptional(key string) string {
	return os.Getenv(key)
}

func Uint64(key string) uint64 {
	v := String(key)
	n, err := strconv.ParseUint(v, 10, 64)
	if err != nil {
		log.Fatalln(key + " has a wrong value. " + err)
	}
	return n
}

func Uint16(key string) uint16 {
	v := String(key)
	n, err := strconv.ParseUint(v, 10, 16)
	if err != nil {
		log.Fatalln(key + " has a wrong value. " + err)
	}
	return uint16(n)
}

func Int(key string) int {
	return int(Uint64(key))
}

func Bool(key string) bool {
	v := String(key)
	if v != "true" && v != "false" {
		log.Fatalln(key + " has wrong value. Accepted only true or false")
	}
	if v == "true" {
		return true
	}
	return false
}