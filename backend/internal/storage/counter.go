package storage

import (
	"log"
	"sync"
	"time"
)

type logCounter struct {
	mu         sync.Mutex
	counter    int
	timestamp  time.Time
	lastTS     time.Time
	lastSessID uint64
	maxNum     int
}

func NewLogCounter() *logCounter {
	nlc := &logCounter{}
	nlc.init()
	return nlc
}

func (c *logCounter) init() {
	c.mu.Lock()
	c.counter = 0
	c.timestamp = time.Now()
	c.mu.Unlock()
}

func (c *logCounter) Update(sessID uint64, ts time.Time) {
	c.mu.Lock()
	c.counter++
	c.lastTS = ts
	c.lastSessID = sessID
	c.mu.Unlock()
}

func (c *logCounter) Print() {
	c.mu.Lock()
	if c.counter > c.maxNum {
		c.maxNum = c.counter
	}
	log.Printf("max/s: %d, count: %d, dur: %ds, msgTS: %s, sessID: %d, part: %d",
		c.maxNum,
		c.counter,
		int(time.Now().Sub(c.timestamp).Seconds()),
		c.lastTS.String(),
		c.lastSessID,
		c.lastSessID%16,
	)
	c.mu.Unlock()
	c.init()
}
