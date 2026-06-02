package model

type AutocompleteRow struct {
	Value         string  `json:"value"`
	RowPercentage float64 `json:"rowPercentage"`
	Name          string  `json:"name,omitempty"`
}
