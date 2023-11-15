package projects

import "log"

type Project struct {
	ProjectID           uint32
	ProjectKey          string
	MaxSessionDuration  int64
	SampleRate          byte
	SaveRequestPayloads bool
	BeaconSize          int64
	Platform            string
	Metadata1           *string
	Metadata2           *string
	Metadata3           *string
	Metadata4           *string
	Metadata5           *string
	Metadata6           *string
	Metadata7           *string
	Metadata8           *string
	Metadata9           *string
	Metadata10          *string
}

func (p *Project) GetMetadataNo(key string) uint {
	if p == nil {
		log.Printf("GetMetadataNo: Project is nil")
		return 0
	}
	if p.Metadata1 != nil && *(p.Metadata1) == key {
		return 1
	}
	if p.Metadata2 != nil && *(p.Metadata2) == key {
		return 2
	}
	if p.Metadata3 != nil && *(p.Metadata3) == key {
		return 3
	}
	if p.Metadata4 != nil && *(p.Metadata4) == key {
		return 4
	}
	if p.Metadata5 != nil && *(p.Metadata5) == key {
		return 5
	}
	if p.Metadata6 != nil && *(p.Metadata6) == key {
		return 6
	}
	if p.Metadata7 != nil && *(p.Metadata7) == key {
		return 7
	}
	if p.Metadata8 != nil && *(p.Metadata8) == key {
		return 8
	}
	if p.Metadata9 != nil && *(p.Metadata9) == key {
		return 9
	}
	if p.Metadata10 != nil && *(p.Metadata10) == key {
		return 10
	}
	return 0
}

func (p *Project) IsMobile() bool {
	return p.Platform == "ios" || p.Platform == "android"
}

func (p *Project) IsWeb() bool {
	return p.Platform == "web"
}
