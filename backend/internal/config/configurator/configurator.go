package configurator

import (
	"context"
	"encoding/json"
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
		if len(line) == 0 {
			continue
		}
		env := strings.Split(line, "=")
		if len(env) < 2 {
			continue
		}
		res[env[0]] = env[1]
	}
	return res, nil
}

func parseFile(a interface{}, path string) {
	// Skip parsing process without logs if we don't have path to config file
	if path == "" {
		return
	}
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
					continue
				}
				val.Field(i).SetBool(boolValue)
			case "time.Duration":
				d, err := time.ParseDuration(value)
				if err != nil {
					log.Printf("can't parse time.Duration value: %s", err)
					continue
				}
				val.Field(i).SetInt(int64(d))
			case "map[string]string":
				var stringMap map[string]string
				if err := json.Unmarshal([]byte(value), &stringMap); err != nil {
					log.Printf("can't parse map[string]string value: %s", err)
					continue
				}
				val.Field(i).Set(reflect.ValueOf(stringMap))
			default:
				log.Println("unknown config type: ", val.Type().Field(i).Type.String())
			}
		}
	}
}

func Process(cfg common.Configer) {
	if err := envconfig.Process(context.Background(), cfg); err != nil {
		log.Fatalf("error while processing env vars: %s", err)
	}
	parseFile(cfg, cfg.GetConfigPath())
}
