package projects

type Project struct {
	ProjectID           uint32  `json:"projectId"`
	Name                string  `json:"name"`
	ProjectKey          string  `json:"projectKey"`
	TenantID            int     `json:"tenantId"`
	Active              bool    `json:"active"`
	MaxSessionDuration  int64   `json:"maxSessionDuration"`
	SampleRate          byte    `json:"sampleRate"`
	SaveRequestPayloads bool    `json:"saveRequestPayloads"`
	BeaconSize          int64   `json:"beaconSize"`
	Platform            string  `json:"platform"`
	Metadata1           *string `json:"metadata1"`
	Metadata2           *string `json:"metadata2"`
	Metadata3           *string `json:"metadata3"`
	Metadata4           *string `json:"metadata4"`
	Metadata5           *string `json:"metadata5"`
	Metadata6           *string `json:"metadata6"`
	Metadata7           *string `json:"metadata7"`
	Metadata8           *string `json:"metadata8"`
	Metadata9           *string `json:"metadata9"`
	Metadata10          *string `json:"metadata10"`
}

func (p *Project) GetMetadataNo(key string) uint {
	if p == nil {
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

var ValidPlatforms = map[string]bool{
	"web": true,
	"ios": true,
}

func (p *Project) IsMobile() bool {
	return p.Platform == "ios" || p.Platform == "android"
}

func (p *Project) IsWeb() bool {
	return p.Platform == "web"
}
