package memory

import (
	"errors"
	"github.com/pbnjay/memory"
	"log"
	"sync"
	"time"
)

type Manager interface {
	HasFreeMemory() bool
}

type managerImpl struct {
	mutex     *sync.RWMutex
	threshold uint64
	current   uint64
}

func NewManager(threshold uint64) (Manager, error) {
	if threshold > 100 {
		return nil, errors.New("threshold must be less than 100")
	}
	m := &managerImpl{
		mutex:     &sync.RWMutex{},
		threshold: threshold,
		current:   1,
	}
	m.calcMemoryUsage()
	go m.worker()
	return m, nil
}

func (m *managerImpl) currentUsage() uint64 {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	return m.current
}

func (m *managerImpl) calcMemoryUsage() {
	total := memory.TotalMemory()
	free := memory.FreeMemory()
	current := uint64(float64((total-free)*100) / float64(total))
	// Check limits
	if current > 100 && m.currentUsage() < 100 {
		log.Printf("can't calculate memory usage, free: %d, total: %d", free, total)
		current = 100
	}
	// Print debug info
	if m.currentUsage() != current {
		log.Printf("total: %d, free: %d, current usage: %d, threshold: %d", total, free, current, m.threshold)
	}
	m.mutex.Lock()
	m.current = current
	m.mutex.Unlock()
}

func (m *managerImpl) worker() {
	for {
		select {
		case <-time.After(3 * time.Second):
			m.calcMemoryUsage()
		}
	}
}

func (m *managerImpl) HasFreeMemory() bool {
	return m.currentUsage() <= m.threshold
}
