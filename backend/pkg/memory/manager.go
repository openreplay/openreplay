package memory

import (
	"context"
	"errors"
	"runtime"
	"sync"
	"time"

	"openreplay/backend/pkg/logger"
)

type Manager interface {
	HasFreeMemory() bool
}

type managerImpl struct {
	log       logger.Logger
	mutex     *sync.RWMutex
	current   uint64
	maximum   uint64
	threshold uint64
	allocated uint64
	total     uint64
}

func NewManager(log logger.Logger, maximumMemory, thresholdValue uint64) (Manager, error) {
	ctx := context.Background()
	if maximumMemory < 1 {
		log.Info(ctx, "maximumMemory is not defined, try to parse memory limit from system")
		memLimit, err := parseMemoryLimit()
		if err != nil {
			log.Error(ctx, "can't parse system memory limit, err: ", err)
		} else {
			log.Info(ctx, "memory limit is defined: %d MiB", memLimit)
		}
		if memLimit > 0 {
			maximumMemory = uint64(memLimit)
		}
	}
	if thresholdValue > 100 {
		return nil, errors.New("threshold must be less than 100")
	}
	m := &managerImpl{
		log:       log,
		mutex:     &sync.RWMutex{},
		threshold: thresholdValue,
		maximum:   maximumMemory,
		current:   0,
	}
	go m.worker()
	return m, nil
}

func (m *managerImpl) currentUsage() uint64 {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	return m.current
}

func (m *managerImpl) calcMemoryUsage() {
	var rtm runtime.MemStats
	runtime.ReadMemStats(&rtm)
	allocated := rtm.Alloc / 1024 / 1024
	total := rtm.Sys / 1024 / 1024
	if allocated > m.maximum && m.HasFreeMemory() {
		m.log.Warn(context.Background(), "memory consumption is greater than maximum memory, current: %d, maximum: %d", allocated, m.maximum)
	}
	current := uint64(float64(allocated*100) / float64(m.maximum))
	m.mutex.Lock()
	m.current = current
	m.allocated = allocated
	m.total = total
	m.mutex.Unlock()
}

func (m *managerImpl) printStat() {
	m.log.Info(context.Background(), "current memory consumption: %d, allocated: %d, maximum: %d, current usage: %d, threshold: %d",
		m.total, m.allocated, m.maximum, m.current, m.threshold)
}

func (m *managerImpl) worker() {
	// If maximum memory is not defined, then we don't need to check memory usage
	if m.maximum == 0 {
		m.current = m.threshold
		return
	}

	// First memory usage calculation
	m.calcMemoryUsage()
	m.printStat()

	// Logs and update ticks
	updateTick := time.Tick(time.Second)
	logsTick := time.Tick(time.Minute)

	// Start worker
	for {
		select {
		case <-updateTick:
			m.calcMemoryUsage()
		case <-logsTick:
			m.printStat()
		}
	}
}

func (m *managerImpl) HasFreeMemory() bool {
	return m.currentUsage() <= m.threshold
}
