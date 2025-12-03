package assets

import (
	"encoding/json"
	"strings"
)

type frame struct {
	FileName string `json:"fileName"`
}

func ExtractJSExceptionSources(payload *string) ([]string, error) {
	var frameList []frame
	err := json.Unmarshal([]byte(*payload), &frameList)
	if err != nil {
		return nil, err
	}

	presentedFileName := make(map[string]bool)
	var fileNamesList []string

	for _, f := range frameList {
		fn := strings.Split(f.FileName, "?")[0]
		if strings.HasPrefix(fn, "http") && !presentedFileName[fn] {
			fileNamesList = append(fileNamesList, f.FileName)
			presentedFileName[fn] = true
		}
	}
	return fileNamesList, nil
}
