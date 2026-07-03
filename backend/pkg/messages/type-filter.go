package messages

type TypeFilter [128]bool

func NewTypeFilter(types []int) *TypeFilter {
	f := &TypeFilter{}
	f.Add(types)
	return f
}

func (f *TypeFilter) Add(types []int) {
	for _, t := range types {
		if t >= 0 && t < len(f) {
			f[t] = true
		}
	}
}

func (f *TypeFilter) Has(t int) bool {
	return t >= 0 && t < len(f) && f[t]
}
