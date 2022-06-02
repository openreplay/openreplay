package storage

import (
	"log"
	"sync"
	"time"
)

type logCounter struct {
	mu        sync.Mutex
	counter   int
	timestamp time.Time
	lastTS    time.Time
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

func (c *logCounter) Update(ts time.Time) {
	c.mu.Lock()
	c.counter++
	c.lastTS = ts
	c.mu.Unlock()
}

func (c *logCounter) Print() {
	c.mu.Lock()
	log.Printf("counter: %d, duration: %s, lastSessionTS: %s",
		c.counter,
		time.Now().Sub(c.timestamp).String(),
		c.lastTS.String(),
	)
	c.mu.Unlock()
	c.init()
}
