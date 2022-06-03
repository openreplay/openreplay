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
	log.Printf("count: %d, dur: %ds, msgTS: %s, sessID: %d, part: %d",
		c.counter,
		int(time.Now().Sub(c.timestamp).Seconds()),
		c.lastTS.String(),
		c.lastSessID,
		c.lastSessID%16,
	)
	c.mu.Unlock()
	c.init()
}
