package player

import (
	"bufio"
	"fmt"
	"log"
	"os"
)

type request struct {
	ts      int64
	method  string
	url     string
	headers map[string][]string
	body    []byte
}

type playerImpl struct {
	//
}

func (p playerImpl) LoadRecord(filePath string) error {
	if filePath == "" {
		return fmt.Errorf("file name is empty")
	}
	file, err := os.OpenFile(filePath, os.O_RDONLY, 0644)
	if err != nil {
		return fmt.Errorf("open file err: %s", err)
	}
	defer file.Close()

	sc := bufio.NewScanner(file)
	for sc.Scan() {
		line := sc.Text()
		log.Println(line)
	}
	if err := sc.Err(); err != nil {
		return fmt.Errorf("scan file error: %v", err)
	}
	return nil
}

func (p playerImpl) PlayRecord(host string) error {
	//TODO implement me
	panic("implement me")
}

type Player interface {
	LoadRecord(filePath string) error
	PlayRecord(host string) error
}

func New() Player {
	return &playerImpl{}
}
