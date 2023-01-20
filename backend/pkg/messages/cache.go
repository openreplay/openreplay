package messages

type pageLocations struct {
	urls map[uint64]string
}

func NewPageLocations() *pageLocations {
	return &pageLocations{urls: make(map[uint64]string)}
}

func (p *pageLocations) Set(sessID uint64, url string) {
	p.urls[sessID] = url
}

func (p *pageLocations) Get(sessID uint64) string {
	url := p.urls[sessID]
	return url
}

func (p *pageLocations) Delete(sessID uint64) {
	delete(p.urls, sessID)
}
