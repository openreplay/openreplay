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

func Uint16(key string) uint16 {
	v := String(key)
	n, _ := strconv.ParseUint(v, 10, 16)
	if n == 0 {
		log.Fatalln(key + " has a wrong value")
	}
	return uint16(n)
}

func Uint64(key string) uint64 {
	v := String(key)
	n, _ := strconv.ParseUint(v, 10, 64)
	if n == 0 {
		log.Fatalln(key + " has a wrong value")
	}
	return n
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