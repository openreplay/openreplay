package postgres

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
)

//go:generate $GOPATH/bin/easytags $GOFILE json

type TenantNotification struct {
	TenantId    uint32                 `db:"tenant_id" json:"tenantId"`
	Title       string                 `db:"title" json:"title"`
	Description string                 `db:"description" json:"description"`
	ButtonText  string                 `db:"button_text" json:"buttonText"`
	ButtonUrl   string                `db:"button_url" json:"buttonUrl"`
	ImageUrl    *string                `db:"image_url" json:"imageUrl"`
	Options     map[string]interface{} `db:"options" json:"options"`
}

type Notifications struct {
	Notifications []*TenantNotification `json:"notifications"`
	Token         string                `json:"token"`
}

func (n *Notifications) Send(url string) {
	n.Token = "nF46JdQqAM5v9KI9lPMpcu8o9xiJGvNNWOGL7TJP"
	body, err := json.Marshal(n)
	if err != nil {
		log.Println(err)
		return
	}
	//log.Println("------------ Sending a new notification")
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		log.Printf("error in POST notifications: %v\n", err)
		return
	}
	//req.Header.Set("X-Custom-Header", "myvalue")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()
	//log.Println("response Status:", resp.Status)
	//log.Println("response Headers:", resp.Header)
	//respBody, _ := ioutil.ReadAll(resp.Body)
	//log.Println("response Body:", string(respBody))
}

func (n TenantNotification) Send(url string) {
	body := Notifications{
		Notifications: []*TenantNotification{&n},
	}
	body.Send(url)
}
