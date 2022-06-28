package configurator

import (
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"reflect"
	"strconv"
	"strings"
	"time"

	"github.com/sethvargo/go-envconfig"
	"openreplay/backend/internal/config/common"
)

func readFile(path string) (map[string]string, error) {
	if path == "" {
		return nil, fmt.Errorf("file path is empty")
	}
	file, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("can't open file: %s", err)
	}
	defer file.Close()
	data, err := io.ReadAll(file)
	if err != nil {
		return nil, fmt.Errorf("can't read file: %s", err)
	}
	log.Println(data)
	res := make(map[string]string)
	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		env := strings.Split(line, "=")
		res[env[0]] = env[1]
	}
	return res, nil
}

func parseFile(a interface{}, path string) {
	envs, err := readFile(path)
	if err != nil {
		log.Printf("can't parse config file: %s", err)
		return
	}

	val := reflect.ValueOf(a).Elem()
	for i := 0; i < val.NumField(); i++ {
		envName := val.Type().Field(i).Tag.Get("env")
		if envName == "" {
			continue
		}
		envName = strings.Split(envName, ",")[0]
		if envName == "" {
			continue
		}
		fmt.Println(envName, val.Type().Field(i).Type.String())
		if value, ok := envs[envName]; ok {
			switch val.Type().Field(i).Type.String() {
			case "string":
				val.Field(i).SetString(value)
			case "int", "int8", "int16", "int32", "int64":
				intValue, err := strconv.Atoi(value)
				if err != nil {
					log.Printf("can't parse int value: %s", err)
					continue
				}
				val.Field(i).SetInt(int64(intValue))
			case "uint", "uint8", "uint16", "uint32", "uint64":
				uintValue, err := strconv.Atoi(value)
				if err != nil {
					log.Printf("can't parse uint value: %s", err)
					continue
				}
				val.Field(i).SetUint(uint64(uintValue))
			case "bool":
				boolValue, err := strconv.ParseBool(value)
				if err != nil {
					log.Printf("can't parse bool value: %s", err)
				}
				val.Field(i).SetBool(boolValue)
			case "time.Duration":
				d, err := time.ParseDuration(value)
				if err != nil {
					log.Printf("can't parse time.Duration value: %s", err)
					continue
				}
				val.Field(i).SetInt(int64(d))
			default:
				log.Println("unknown config type: ", val.Type().Field(i).Type.String())
			}
		}
	}
}

func Process(cfg common.Configer) {
	ctx := context.Background()
	if err := envconfig.Process(ctx, cfg); err != nil {
		log.Println("env process err: ", err)
		//log.Fatal(err)
	}
	parseFile(cfg, cfg.GetConfigPath())
}
