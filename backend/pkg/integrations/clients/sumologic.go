package clients

import (
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"strings"
	"time"

	"openreplay/backend/pkg/messages"
)

/*
The maximum value for limit is 10,000 messages or 100 MB in total message size,
which means the query may return less than 10,000 messages if you exceed the size limit.

API Documentation: https://help.sumologic.com/APIs/Search-Job-API/About-the-Search-Job-API
*/
const SL_LIMIT = 10000

type sumologic struct {
	AccessId  string // `json:"access_id"`
	AccessKey string // `json:"access_key"`
	cookies   []*http.Cookie
}

type sumplogicJobResponce struct {
	Id string
}

type sumologicJobStatusResponce struct {
	State        string
	MessageCount int
	//PendingErrors []string
}

type sumologicResponce struct {
	Messages []struct {
		Map json.RawMessage
	}
}

type sumologicEvent struct {
	Timestamp uint64 `json:"_messagetime,string"`
	Raw       string `json:"_raw"`
}

func (sl *sumologic) deleteJob(jobId string, errChan chan<- error) {
	requestURL := fmt.Sprintf("https://api.%vsumologic.com/api/v1/search/jobs/%v", "eu.", jobId)
	req, err := http.NewRequest("DELETE", requestURL, nil)
	if err != nil {
		errChan <- fmt.Errorf("Error on DELETE request creation: %v", err)
		return
	}
	req.Header.Add("Content-Type", "application/json")
	req.Header.Add("Accept", "application/json")
	req.SetBasicAuth(sl.AccessId, sl.AccessKey)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		errChan <- fmt.Errorf("Error on DELETE request: %v", err)
		return
	}
	io.Copy(ioutil.Discard, resp.Body)
	resp.Body.Close()
}

func (sl *sumologic) Request(c *client) error {
	fromTs := c.requestData.GetLastMessageTimestamp() + 1 // From next millisecond
	toTs := time.Now().UnixMilli()
	requestURL := fmt.Sprintf("https://api.%vsumologic.com/api/v1/search/jobs", "eu.") // deployment server??
	jsonBody := fmt.Sprintf(`{
		"query": "\"openReplaySessionToken=\" AND (*error* OR *fail* OR *exception*)",
		"from": %v,
		"to": %v
	}`, fromTs, toTs) // docs and api are awful. from/to seems to work inclusively
	req, err := http.NewRequest("POST", requestURL, strings.NewReader(jsonBody))
	if err != nil {
		return err
	}
	//q := req.URL.Query()
	//q.Add("query", "\"asayer_session_id=\" AND (*error* OR *fail* OR *exception*)")
	//q.Add("from", )
	//q.Add("to")
	//q.Add("timeZone", "UTC")
	//q.Add("byReceiptTime", "true")

	for _, cookie := range sl.cookies {
		req.AddCookie(cookie)
	}

	req.Header.Add("Content-Type", "application/json")
	req.Header.Add("Accept", "application/json")
	req.SetBasicAuth(sl.AccessId, sl.AccessKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("Error while requesting search job start: %v", err)
	}
	defer resp.Body.Close()

	// Can be 202/400/415  according to docs
	// https://help.sumologic.com/APIs/Search-Job-API/About-the-Search-Job-API#status-codes
	// responce body is NOT the same as in docs (look at the sumologic_job_start.json)
	if resp.StatusCode >= 400 {
		io.Copy(ioutil.Discard, resp.Body) // Read the body to free socket
		return fmt.Errorf("Sumologic: server respond with the code %v | req %v |Resp: %v", resp.StatusCode, *req, *resp)
	}
	sl.cookies = resp.Cookies()

	var jobResponce sumplogicJobResponce
	if err = json.NewDecoder(resp.Body).Decode(&jobResponce); err != nil {
		return fmt.Errorf("Error on parsing responce: %v", err)
	}

	defer sl.deleteJob(jobResponce.Id, c.errChan)

	requestURL = fmt.Sprintf("https://api.%vsumologic.com/api/v1/search/jobs/%v", "eu.", jobResponce.Id)
	req, err = http.NewRequest("GET", requestURL, nil)
	if err != nil {
		return err
	}
	req.Header.Add("Accept", "application/json")
	req.SetBasicAuth(sl.AccessId, sl.AccessKey)
	for _, cookie := range sl.cookies {
		req.AddCookie(cookie)
	}

	tick := time.Tick(5 * time.Second)
	for {
		<-tick
		resp, err = http.DefaultClient.Do(req)
		if err != nil {
			return err // TODO: retry, counter/timeout
		}
		defer resp.Body.Close()
		// TODO: check resp.StatusCode
		//sl.cookies = resp.Cookies() TODO?
		var jobStatus sumologicJobStatusResponce
		err := json.NewDecoder(resp.Body).Decode(&jobStatus)
		if err != nil {
			return err // TODO: retry, counter/timeout
		}
		if jobStatus.State == "DONE GATHERING RESULTS" {
			offset := 0
			for offset < jobStatus.MessageCount {
				requestURL = fmt.Sprintf(
					"https://api.%vsumologic.com/api/v1/search/jobs/%v/messages?offset=%v&limit=%v",
					"eu.",
					jobResponce.Id,
					offset,
					SL_LIMIT,
				)
				req, err = http.NewRequest("GET", requestURL, nil)
				if err != nil {
					return err // TODO: retry, counter/timeout
				}
				req.Header.Add("Accept", "application/json")
				req.SetBasicAuth(sl.AccessId, sl.AccessKey)
				for _, cookie := range sl.cookies {
					req.AddCookie(cookie)
				}
				resp, err = http.DefaultClient.Do(req)
				if err != nil {
					return err
				}
				defer resp.Body.Close()

				var slResp sumologicResponce
				err := json.NewDecoder(resp.Body).Decode(&slResp)
				if err != nil {
					return err
				}
				for _, m := range slResp.Messages {
					var e sumologicEvent
					err = json.Unmarshal(m.Map, &e)
					if err != nil {
						c.errChan <- err
						continue
					}

					token, err := GetToken(e.Raw)
					if err != nil {
						c.errChan <- err
						continue
					}
					name := e.Raw
					if len(name) > 20 {
						name = name[:20] // not sure about that
					}
					c.requestData.SetLastMessageTimestamp(e.Timestamp)
					c.evChan <- &SessionErrorEvent{
						//SessionID: sessionID,
						Token: token,
						IntegrationEvent: &messages.IntegrationEvent{
							Source:    "sumologic",
							Timestamp: e.Timestamp,
							Name:      name,
							Payload:   string(m.Map), //e.Raw ?
						},
					}

				}
				offset += len(slResp.Messages)
			}
			break
		}
		if jobStatus.State != "NOT STARTED" &&
			jobStatus.State != "GATHERING RESULTS" {
			// error
			break
		}
	}
	return nil
}
