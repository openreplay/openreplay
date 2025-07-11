package service

type Query struct {
	Key   string
	Value string
}

type Filter struct {
	Value    []string `json:"values"`
	Operator string   `json:"operator"` // is|contains
}

type Pagination struct {
	Limit int `json:"limit"`
	Page  int `json:"page"`
}

type Sort struct {
	Key   string `json:"key"`   // useless
	Order string `json:"order"` // [ASC|DESC]
}

type Request struct {
	Filters    map[string]Filter `json:"filter"`
	Pagination Pagination        `json:"pagination"`
	Sort       Sort              `json:"sort"`
}
