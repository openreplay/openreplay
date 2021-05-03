package integration

import (
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/cloudwatchlogs"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"

	"strings"
	"regexp"
	"openreplay/backend/pkg/messages"
)


var reIsException = regexp.MustCompile(`(?i)exception|error`)

type cloudwatch struct {
  AwsAccessKeyId string    // `json:"aws_access_key_id"`
  AwsSecretAccessKey string // `json:"aws_secret_access_key"`
  LogGroupName string       // `json:"log_group_name"`
  Region string             // `json:"region"`
}


func (cw *cloudwatch) Request(c *client) error {
	startTs := int64(c.getLastMessageTimestamp() + 1)  // From next millisecond
	//endTs := utils.CurrentTimestamp()
	sess, err := session.NewSession(aws.NewConfig().
	  WithRegion(cw.Region).
	  WithCredentials(
	  	credentials.NewStaticCredentials(cw.AwsAccessKeyId, cw.AwsSecretAccessKey, ""),
	  ),
	)
	if err != nil {
		return err
	}
	svc := cloudwatchlogs.New(sess)


	filterOptions := new(cloudwatchlogs.FilterLogEventsInput).
		SetStartTime(startTs).  // Inclusively both startTime and endTime
		// SetEndTime(endTs). // Default nil?
		// SetLimit(10000). // Default 10000
		SetLogGroupName(cw.LogGroupName).
		SetFilterPattern("openReplaySessionToken")
		//SetFilterPattern("asayer_session_id")

	for {
		output, err := svc.FilterLogEvents(filterOptions)
		if err != nil {
			return err
		}
		for _, e := range output.Events {
			if e.Message == nil || e.Timestamp == nil {
				continue
			}
			if !reIsException.MatchString(*e.Message) { // too weak condition ?
				continue
			}  
			token, err := GetToken(*e.Message)
			if err != nil {
				c.errChan <- err
				continue
			}
			name := ""
			if e.LogStreamName != nil {
				name = *e.LogStreamName
			}
			timestamp := uint64(*e.Timestamp)
			c.setLastMessageTimestamp(timestamp)
			c.evChan <- &SessionErrorEvent{
				//SessionID: sessionID,
				Token: token,
				RawErrorEvent: &messages.RawErrorEvent{
					Source: "cloudwatch",
					Timestamp: timestamp,  // e.IngestionTime ??
					Name: name,
					Payload: strings.ReplaceAll(e.String(), "\n", ""),
				},
			}
		}

		if output.NextToken == nil {
			break;
		}
		filterOptions.NextToken = output.NextToken
	}
	return nil
}