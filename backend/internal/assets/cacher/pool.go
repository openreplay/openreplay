package cacher

import (
	"sync"
)

type Task struct {
	requestURL string
	host       string
	sessionID  uint64
	depth      byte
	urlContext string
	isJS       bool
	cachePath  string
	attempt    int
}

type WorkerPool struct {
	tasks chan *Task
	wg    sync.WaitGroup
	done  chan struct{}
	term  sync.Once
	size  int
	job   Job
}

func (p *WorkerPool) CanAddTask() bool {
	if len(p.tasks) < cap(p.tasks) {
		return true
	}
	return false
}

type Job func(task *Task)

func NewPool(size, queueSize int, job Job) *WorkerPool {
	newPool := &WorkerPool{
		tasks: make(chan *Task, queueSize),
		done:  make(chan struct{}),
		size:  size,
		job:   job,
	}
	newPool.init()
	return newPool
}

func (p *WorkerPool) init() {
	p.wg.Add(p.size)
	for i := 0; i < p.size; i++ {
		go p.worker()
	}
}

func (p *WorkerPool) worker() {
	for {
		select {
		case newTask := <-p.tasks:
			p.job(newTask)
		case <-p.done:
			p.wg.Done()
			return
		}
	}
}

// AddTask blocking func; use only from the consumer where backpressure is desired
func (p *WorkerPool) AddTask(task *Task) {
	p.tasks <- task
}

// tryAddTask enqueues without blocking; use from inside workers (CSS recursion) and by the retry scheduler.
func (p *WorkerPool) tryAddTask(task *Task) bool {
	select {
	case p.tasks <- task:
		return true
	default:
		return false
	}
}

func (p *WorkerPool) Stop() {
	p.term.Do(func() {
		close(p.done)
	})
	p.wg.Wait()
}
