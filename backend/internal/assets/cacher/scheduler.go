package cacher

import (
	"container/heap"
	"sync"
	"time"
)

const poolFullRetryDelay = 50 * time.Millisecond

type scheduledTask struct {
	task *Task
	at   time.Time
}

type taskHeap []*scheduledTask

func (h taskHeap) Len() int           { return len(h) }
func (h taskHeap) Less(i, j int) bool { return h[i].at.Before(h[j].at) }
func (h taskHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }

func (h *taskHeap) Push(x any) { *h = append(*h, x.(*scheduledTask)) }

func (h *taskHeap) Pop() any {
	old := *h
	n := len(old)
	it := old[n-1]
	old[n-1] = nil
	*h = old[:n-1]
	return it
}

type scheduler struct {
	mu       sync.Mutex
	heap     taskHeap
	limit    int
	tryAdd   func(*Task) bool
	onSize   func(int)
	wakeup   chan struct{}
	done     chan struct{}
	stopOnce sync.Once
}

func newScheduler(limit int, tryAdd func(*Task) bool, onSize func(int)) *scheduler {
	s := &scheduler{
		limit:  limit,
		tryAdd: tryAdd,
		onSize: onSize,
		wakeup: make(chan struct{}, 1),
		done:   make(chan struct{}),
	}
	go s.run()
	return s
}

func (s *scheduler) schedule(task *Task, t time.Time) bool {
	s.mu.Lock()
	if s.limit > 0 && len(s.heap) >= s.limit {
		s.mu.Unlock()
		return false
	}
	heap.Push(&s.heap, &scheduledTask{task: task, at: t})
	size := len(s.heap)
	s.mu.Unlock()
	if s.onSize != nil {
		s.onSize(size)
	}
	select {
	case s.wakeup <- struct{}{}:
	default:
	}
	return true
}

func (s *scheduler) run() {
	timer := time.NewTimer(time.Hour)
	defer timer.Stop()
	for {
		s.mu.Lock()
		now := time.Now()
		poolFull := false
		for len(s.heap) > 0 && !s.heap[0].at.After(now) {
			st := heap.Pop(&s.heap).(*scheduledTask)
			if !s.tryAdd(st.task) {
				// pool is full: put it back shortly and back off so we don't spin
				st.at = now.Add(poolFullRetryDelay)
				heap.Push(&s.heap, st)
				poolFull = true
				break
			}
		}
		var wait time.Duration
		if len(s.heap) > 0 {
			wait = s.heap[0].at.Sub(now)
			if wait < 0 {
				wait = 0
			}
		} else {
			wait = time.Hour
		}
		if poolFull && wait < poolFullRetryDelay {
			wait = poolFullRetryDelay
		}
		size := len(s.heap)
		s.mu.Unlock()
		if s.onSize != nil {
			s.onSize(size)
		}

		if !timer.Stop() {
			select {
			case <-timer.C:
			default:
			}
		}
		timer.Reset(wait)

		select {
		case <-s.done:
			return
		case <-s.wakeup:
		case <-timer.C:
		}
	}
}

func (s *scheduler) stop() {
	s.stopOnce.Do(func() { close(s.done) })
}
