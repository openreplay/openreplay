package integration


import (
	"google.golang.org/api/option"
	"cloud.google.com/go/logging/logadmin"
	"google.golang.org/api/iterator"
	
	//"strconv"
	"encoding/json"
	"time"
	"fmt"
	"context"

  "openreplay/backend/pkg/utime"
	"openreplay/backend/pkg/messages"
)


// Old: asayerSessionId

const SD_FILTER_QUERY = `
	logName = "projects/%v/logs/%v"
	labels.openReplaySessionToken!=null AND
  severity>=ERROR AND
  timestamp>="%v"
`

type stackdriver struct {
	ServiceAccountCredentials string // `json:"service_account_credentials"`
	LogName string                   // `json:"log_name"`
}

type saCreds struct {
	ProjectId string `json:"project_id"`
}

func (sd *stackdriver) Request(c *client) error {
	fromTs := c.getLastMessageTimestamp() + 1 // Timestamp is RFC3339Nano, so we take the next millisecond
	fromFormatted := time.Unix(0, int64(fromTs *1e6)).Format(time.RFC3339Nano)
	ctx := context.Background()

	var parsedCreds saCreds 
	err := json.Unmarshal([]byte(sd.ServiceAccountCredentials), &parsedCreds)
	if err != nil {
		return err
	}

	opt := option.WithCredentialsJSON([]byte(sd.ServiceAccountCredentials))
	client, err := logadmin.NewClient(ctx, parsedCreds.ProjectId, opt)
	if err != nil {
	  return err
	}
	defer client.Close()
	
  filter := fmt.Sprintf(SD_FILTER_QUERY, parsedCreds.ProjectId, sd.LogName, fromFormatted)
  // By default, Entries are listed from oldest to newest.
  /*  ResourceNames(rns []string)
  		"projects/[PROJECT_ID]"
			"organizations/[ORGANIZATION_ID]"
			"billingAccounts/[BILLING_ACCOUNT_ID]"
			"folders/[FOLDER_ID]"
  */
  it := client.Entries(ctx, logadmin.Filter(filter))

  // TODO: Pagination:
  //pager := iterator.NewPager(it, 1000, "")
  //nextToken, err := pager.NextPage(&entries)
  //if nextToken == "" { break }
  for {
    e, err := it.Next()
    if err == iterator.Done {
      break
    }
    if err != nil {
      return err
    }

    token := e.Labels["openReplaySessionToken"]
    // sessionID, err := strconv.ParseUint(strSessionID, 10, 64)
    // if err != nil {
    // 	c.errChan <- err
    // 	continue
    // }
    jsonEvent, err := json.Marshal(e)
    if err != nil {
    	c.errChan <- err
    	continue
    }
    timestamp := uint64(utime.ToMilliseconds(e.Timestamp))
    c.setLastMessageTimestamp(timestamp)
    c.evChan <- &SessionErrorEvent{
			//SessionID: sessionID,
			Token: token,
			RawErrorEvent: &messages.RawErrorEvent{
				Source: "stackdriver",
				Timestamp: timestamp,
				Name: e.InsertID, // not sure about that
				Payload: string(jsonEvent),
			},
		}
	}
	return nil
}