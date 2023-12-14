package model

import (
	"encoding/json"
	"time"
)

const MAX_ATTEMPTS_IN_A_ROW = 4
const MAX_ATTEMPTS = 40
const ATTEMPTS_INTERVAL = 3 * 60 * 60 * 1000

type RequestInfo struct {
	LastMessageId              string
	LastMessageTimestamp       uint64
	LastAttemptTimestamp       int64
	UnsuccessfullAttemptsCount int
}

func (c *RequestInfo) SetLastMessageTimestamp(timestamp uint64) {
	if timestamp > c.LastMessageTimestamp {
		c.LastMessageTimestamp = timestamp
	}
}
func (c *RequestInfo) GetLastMessageTimestamp() uint64 {
	return c.LastMessageTimestamp
}
func (c *RequestInfo) SetLastMessageId(timestamp uint64, id string) {
	c.LastMessageId = id
	c.LastMessageTimestamp = timestamp
}
func (c *RequestInfo) GetLastMessageId() string {
	return c.LastMessageId
}

func (c *RequestInfo) CanAttempt() bool {
	if c.UnsuccessfullAttemptsCount >= MAX_ATTEMPTS ||
		(c.UnsuccessfullAttemptsCount >= MAX_ATTEMPTS_IN_A_ROW &&
			time.Now().UnixMilli()-c.LastAttemptTimestamp < ATTEMPTS_INTERVAL) {
		return false
	}
	return true
}

func (c *RequestInfo) UpdateLastAttempt() {
	c.LastAttemptTimestamp = time.Now().UnixMilli()
}

func (c *RequestInfo) Inc() {
	c.UnsuccessfullAttemptsCount++
}

func (c *RequestInfo) Reset() {
	c.UnsuccessfullAttemptsCount = 0
}

func (c *RequestInfo) Encode() ([]byte, error) {
	return json.Marshal(c)
}
