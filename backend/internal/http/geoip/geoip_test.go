package geoip

import (
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"testing"
)

func LoadGeoLiteDB() {
	fileURL := "https://static.openreplay.com/geoip/GeoLite2-City.mmdb"

	// Create the file
	file, err := os.Create("geo.mmdb")
	if err != nil {
		log.Fatal(err)
	}
	defer file.Close()

	// Download the file
	response, err := http.Get(fileURL)
	if err != nil {
		log.Fatal(err)
	}
	defer response.Body.Close()

	// Check if the request was successful
	if response.StatusCode != http.StatusOK {
		log.Fatalf("Failed to download file: %s", response.Status)
	}

	// Copy the downloaded file to the local file
	_, err = io.Copy(file, response.Body)
	if err != nil {
		log.Fatal(err)
	}
}

func DeleteGeoLiteDB() {
	if err := os.Remove("geo.mmdb"); err != nil {
		log.Fatal(err)
	}
}

func TestGeoIP(t *testing.T) {
	LoadGeoLiteDB()
	defer DeleteGeoLiteDB()

	geoIP := New("geo.mmdb")

	ip := net.ParseIP("92.151.113.120")
	correctResult := &GeoRecord{
		Country: "FR",
		State:   "Île-de-France",
		City:    "Courbevoie",
	}
	result := geoIP.Parse(ip)

	if result.Country != correctResult.Country {
		t.Errorf("Country is incorrect: %s != %s", result.Country, correctResult.Country)
	}
	if result.State != correctResult.State {
		t.Errorf("State is incorrect: %s != %s", result.State, correctResult.State)
	}
	if result.City != correctResult.City {
		t.Errorf("City is incorrect: %s != %s", result.City, correctResult.City)
	}

	emptyIP := net.ParseIP("")
	correctResult = &GeoRecord{
		Country: "UN",
		State:   "",
		City:    "",
	}
	result = geoIP.Parse(emptyIP)

	if result.Country != correctResult.Country {
		t.Errorf("Country is incorrect: %s != %s", result.Country, correctResult.Country)
	}
	if result.State != correctResult.State {
		t.Errorf("State is incorrect: %s != %s", result.State, correctResult.State)
	}
	if result.City != correctResult.City {
		t.Errorf("City is incorrect: %s != %s", result.City, correctResult.City)
	}
}
