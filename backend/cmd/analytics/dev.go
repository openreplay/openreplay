//go:build dev

package main

import (
	"log"

	"github.com/joho/godotenv"
)

func initLocal() {
	log.Printf("Loading .env file for development environment")
	err := godotenv.Load(".env")
	if err != nil {
		log.Printf("Error loading .env file")
	}
}
