package memory

import (
	"errors"
	"log"
	"sync"
	"time"

	"github.com/pbnjay/memory"
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
	go m.worker()
	return m, nil
}

func (m *managerImpl) currentFree() uint64 {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	return m.current
}

func (m *managerImpl) worker() {
	for {
		select {
		case <-time.After(10 * time.Second):
			total := memory.TotalMemory()
			free := memory.FreeMemory()
			current := uint64(float64(free*100) / float64(total))
			// DEBUG_START
			log.Printf("total: %d, free: %d, current: %d, threshold: %d", total, free, current, m.threshold)
			// DEBUG_END
			if current >= 100 && m.currentFree() < 100 {
				log.Printf("can't calculate free memory, free: %d, total: %d", free, total)
				current = 100
			}
			m.mutex.Lock()
			m.current = current
			m.mutex.Unlock()
		}
	}
}

func (m *managerImpl) HasFreeMemory() bool {
	return m.currentFree() <= m.threshold
}
