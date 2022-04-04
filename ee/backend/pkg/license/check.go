package license

import (
	"log"
	"net/http"
	"encoding/json"
	"io/ioutil"
	"bytes"

	"openreplay/backend/pkg/env"
)



type request struct {
	MID string  `json:"mid"`
	License string `json:"license"`
}

type response struct {
	Data struct {
		IsValid bool `json:"valid"`
		ExpirationTimestamp int64 `json:"expiration"`
	} `json:"data"`
}


func CheckLicense() {
	license := env.String("LICENSE_KEY")

	requestBody, err := json.Marshal(request{ License: license })
	if err != nil {
		log.Fatal("Can not form a license check request.")
	}

	resp, err := http.Post("https://api.openreplay.com/os/license", "application/json", bytes.NewReader(requestBody))
	if err != nil {
		log.Fatalf("Error while checking license. %v", err)
	}

	if resp.StatusCode != 200 {
		log.Fatal("Error on license check request.")
	}

	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Error while reading license check response. %v", err)
	}

	respJson := new(response)
	if err = json.Unmarshal(body, respJson); err != nil {
		log.Fatalf("Error while parsing license check response. %v", err)
	}

	if !respJson.Data.IsValid {
		log.Fatal("License is not valid.")
	}


}