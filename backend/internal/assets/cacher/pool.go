package cacher

import (
	"log"
	"sync"
)

type Task struct {
	requestURL string
	sessionID  uint64
	depth      byte
	urlContext string
	isJS       bool
	cachePath  string
	retries    int
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

func NewPool(size int, job Job) *WorkerPool {
	newPool := &WorkerPool{
		tasks: make(chan *Task, 128),
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

func (p *WorkerPool) AddTask(task *Task) {
	if task.retries <= 0 {
		return
	}
	p.tasks <- task
}

func (p *WorkerPool) Stop() {
	log.Printf("stopping workers")
	p.term.Do(func() {
		close(p.done)
	})
	p.wg.Wait()
	log.Printf("all workers have been stopped")
}
