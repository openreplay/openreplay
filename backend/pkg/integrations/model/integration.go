package model

import (
	"encoding/json"
	"fmt"
	"time"
)

type Integration struct {
	ProjectID   uint32          `json:"project_id"`
	Provider    string          `json:"provider"`
	RequestData json.RawMessage `json:"request_data"`
	Options     json.RawMessage `json:"options"`
}

func (i *Integration) Encode() []byte {
	b, _ := json.Marshal(i)
	return b
}

func (i *Integration) Decode(data []byte) error {
	return json.Unmarshal(data, i)
}

func (i *Integration) GetKey() string {
	return fmt.Sprintf("%d%s", i.ProjectID, i.Provider)
}

func (i *Integration) GetRequestInfo() (*RequestInfo, error) {
	ri := new(RequestInfo)
	if err := json.Unmarshal(i.RequestData, ri); err != nil {
		return nil, err
	}
	if ri.LastMessageTimestamp == 0 {
		ri.LastMessageTimestamp = uint64(time.Now().Add(-time.Hour * 24).UnixMilli())
	}
	return ri, nil
}
