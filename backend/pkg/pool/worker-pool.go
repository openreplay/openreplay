package pool

import "sync"

type task struct {
	Payload interface{}
	toStop  bool
}

func newTask(payload interface{}) *task {
	return &task{Payload: payload}
}

func newStopSignal() *task {
	return &task{toStop: true}
}

type workerPoolImpl struct {
	wg              *sync.WaitGroup
	tasks           chan *task
	numberOfWorkers int
	handler         func(interface{})
}

type WorkerPool interface {
	Submit(payload interface{})
	Pause()
	Stop()
}

func NewPool(numberOfWorkers, queueSize int, handler func(payload interface{})) WorkerPool {
	pool := &workerPoolImpl{
		wg:              &sync.WaitGroup{},
		tasks:           make(chan *task, queueSize),
		numberOfWorkers: numberOfWorkers,
		handler:         handler,
	}
	pool.runWorkers()
	return pool
}

func (p *workerPoolImpl) runWorkers() {
	for i := 0; i < p.numberOfWorkers; i++ {
		p.wg.Add(1)
		go p.worker()
	}
}

func (p *workerPoolImpl) Submit(payload interface{}) {
	p.tasks <- newTask(payload)
}

func (p *workerPoolImpl) stop() {
	for i := 0; i < p.numberOfWorkers; i++ {
		p.tasks <- newStopSignal()
	}
	p.wg.Wait()
}

func (p *workerPoolImpl) Pause() {
	p.stop()
	p.runWorkers()
}

func (p *workerPoolImpl) Stop() {
	p.stop()
	close(p.tasks)
}

func (p *workerPoolImpl) worker() {
	defer p.wg.Done()
	for {
		select {
		case t := <-p.tasks:
			if t.toStop {
				return
			}
			p.handler(t.Payload)
		}
	}
}
