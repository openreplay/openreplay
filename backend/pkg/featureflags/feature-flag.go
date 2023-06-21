package featureflags

import (
	"encoding/json"
	"fmt"
	"github.com/jackc/pgtype"
	"log"
	"math/rand"
	"strconv"
	"strings"
	"time"
)

type FeatureFlagsRequest struct {
	ProjectID    string                 `json:"projectID"`
	UserOS       string                 `json:"os"`
	UserDevice   string                 `json:"device"`
	UserCountry  string                 `json:"country"`
	UserState    string                 `json:"state"`
	UserCity     string                 `json:"city"`
	UserBrowser  string                 `json:"browser"`
	Referrer     string                 `json:"referrer"`
	UserID       string                 `json:"userID"`
	Metadata     map[string]string      `json:"metadata"`
	PersistFlags map[string]interface{} `json:"persistFlags"` // bool or string
}

type FeatureFlagsResponse struct {
	Flags []interface{} `json:"flags"`
}

type FilterType string

const (
	UserCountry FilterType = "userCountry"
	UserCity    FilterType = "userCity"
	UserState   FilterType = "userState"
	UserOS      FilterType = "userOs"
	UserBrowser FilterType = "userBrowser"
	UserDevice  FilterType = "userDevice"
	UserID      FilterType = "userId"
	Referrer    FilterType = "referrer"
	Metadata    FilterType = "metadata"
)

type FilterOperator string

const (
	Is          FilterOperator = "is"
	IsNot       FilterOperator = "isNot"
	IsAny       FilterOperator = "isAny"
	Contains    FilterOperator = "contains"
	NotContains FilterOperator = "notContains"
	StartsWith  FilterOperator = "startsWith"
	EndsWith    FilterOperator = "endsWith"
	IsUndefined FilterOperator = "isUndefined"
)

type FeatureFlagFilter struct {
	Type     FilterType     `json:"type"`
	Operator FilterOperator `json:"operator"`
	Source   string         `json:"source"`
	Values   []string       `json:"value"`
}

type FeatureFlagCondition struct {
	Filters           []*FeatureFlagFilter
	RolloutPercentage int
}

type FeatureFlagVariant struct {
	Value             string
	Payload           string
	RolloutPercentage int
}

type FlagType string

const (
	Single FlagType = "single"
	Multi  FlagType = "multi"
)

type FeatureFlag struct {
	FlagID     uint32
	FlagKey    string
	FlagType   FlagType
	IsPersist  bool
	Payload    string
	Conditions []*FeatureFlagCondition
	Variants   []*FeatureFlagVariant
}

type FeatureFlagPG struct {
	FlagID             uint32
	FlagKey            string
	FlagType           string
	IsPersist          bool
	Payload            *string
	RolloutPercentages pgtype.EnumArray
	Filters            pgtype.TextArray
	Values             pgtype.TextArray
	Payloads           pgtype.TextArray
	VariantRollout     pgtype.EnumArray
}

type flagInfo struct {
	Key       string      `json:"key"`
	IsPersist bool        `json:"is_persist"`
	Value     interface{} `json:"value"`
	Payload   string      `json:"payload"`
}

func numArrayToIntSlice(arr *pgtype.EnumArray) []int {
	slice := make([]int, 0, len(arr.Elements))
	for i := range arr.Elements {
		num, err := strconv.Atoi(arr.Elements[i].String)
		if err != nil {
			log.Printf("can't convert string to int: %v, full arr struct: %+v", err, *arr)
			slice = append(slice, 0)
		} else {
			slice = append(slice, num)
		}
	}
	return slice
}

func parseFlagConditions(conditions *pgtype.TextArray, rolloutPercentages *pgtype.EnumArray) ([]*FeatureFlagCondition, error) {
	percents := numArrayToIntSlice(rolloutPercentages)
	if len(conditions.Elements) != len(percents) {
		return nil, fmt.Errorf("error: len(conditions.Elements) != len(percents)")
	}
	conds := make([]*FeatureFlagCondition, 0, len(conditions.Elements))
	for i, currCond := range conditions.Elements {
		var filters []*FeatureFlagFilter

		err := json.Unmarshal([]byte(currCond.String), &filters)
		if err != nil {
			return nil, fmt.Errorf("filter unmarshal error: %v", err)
		}
		conds = append(conds, &FeatureFlagCondition{
			Filters:           filters,
			RolloutPercentage: percents[i],
		})
	}
	return conds, nil
}

func parseFlagVariants(values *pgtype.TextArray, payloads *pgtype.TextArray, variantRollout *pgtype.EnumArray) ([]*FeatureFlagVariant, error) {
	percents := numArrayToIntSlice(variantRollout)
	variants := make([]*FeatureFlagVariant, 0, len(values.Elements))
	if len(values.Elements) != len(payloads.Elements) || len(values.Elements) != len(percents) {
		return nil, fmt.Errorf("wrong number of variant elements")
	}
	for i := range values.Elements {
		variants = append(variants, &FeatureFlagVariant{
			Value:             values.Elements[i].String,
			Payload:           payloads.Elements[i].String,
			RolloutPercentage: percents[i],
		})
	}
	return variants, nil
}

func ParseFeatureFlag(rawFlag *FeatureFlagPG) (*FeatureFlag, error) {
	flag := &FeatureFlag{
		FlagID:    rawFlag.FlagID,
		FlagKey:   rawFlag.FlagKey,
		FlagType:  FlagType(rawFlag.FlagType),
		IsPersist: rawFlag.IsPersist,
		Payload: func() string {
			if rawFlag.Payload != nil {
				return *rawFlag.Payload
			}
			return ""
		}(),
	}
	// Parse conditions
	conditions, err := parseFlagConditions(&rawFlag.Filters, &rawFlag.RolloutPercentages)
	if err != nil {
		return nil, fmt.Errorf("error: parseFlagConditions: %v", err)
	}
	flag.Conditions = conditions

	if flag.FlagType == Single {
		flag.Variants = []*FeatureFlagVariant{}
		return flag, nil
	}

	// Parse variants
	variants, err := parseFlagVariants(&rawFlag.Values, &rawFlag.Payloads, &rawFlag.VariantRollout)
	if err != nil {
		return nil, fmt.Errorf("error: parseFlagVariants: %v", err)
	}
	flag.Variants = variants
	return flag, nil
}

func checkCondition(varValue string, exprValues []string, operator FilterOperator) bool {
	switch operator {
	case Is:
		for _, value := range exprValues {
			if varValue == value {
				return true
			}
		}
	case IsNot:
		for _, value := range exprValues {
			if varValue == value {
				return false
			}
		}
		return true
	case IsAny:
		if varValue != "" {
			return true
		}
	case Contains:
		for _, value := range exprValues {
			if strings.Contains(varValue, value) {
				return true
			}
		}
	case NotContains:
		for _, value := range exprValues {
			if strings.Contains(varValue, value) {
				return false
			}
		}
		return true
	case StartsWith:
		for _, value := range exprValues {
			if strings.HasPrefix(varValue, value) {
				return true
			}
		}
	case EndsWith:
		for _, value := range exprValues {
			if strings.HasSuffix(varValue, value) {
				return true
			}
		}
	case IsUndefined:
		return varValue == ""
	}
	return false
}

func ComputeFlagValue(flag *FeatureFlag, sessInfo *FeatureFlagsRequest) interface{} {
	for _, cond := range flag.Conditions {
		conditionValue := true
		for _, filter := range cond.Filters {
			filterValue := false
			switch filter.Type {
			case UserCountry:
				filterValue = checkCondition(sessInfo.UserCountry, filter.Values, filter.Operator)
			case UserCity:
				filterValue = checkCondition(sessInfo.UserCity, filter.Values, filter.Operator)
			case UserState:
				filterValue = checkCondition(sessInfo.UserState, filter.Values, filter.Operator)
			case UserOS:
				filterValue = checkCondition(sessInfo.UserOS, filter.Values, filter.Operator)
			case UserBrowser:
				filterValue = checkCondition(sessInfo.UserBrowser, filter.Values, filter.Operator)
			case UserDevice:
				filterValue = checkCondition(sessInfo.UserDevice, filter.Values, filter.Operator)
			case UserID:
				filterValue = checkCondition(sessInfo.UserID, filter.Values, filter.Operator)
			case Referrer:
				filterValue = checkCondition(sessInfo.Referrer, filter.Values, filter.Operator)
			case Metadata:
				filterValue = checkCondition(sessInfo.Metadata[filter.Source], filter.Values, filter.Operator)
			default:
				filterValue = false
			}
			// If any filter is false, the condition is false, so we can check the next condition
			if !filterValue {
				conditionValue = false
				break
			}
		}
		// If any condition is true, we can return the flag value
		if conditionValue {
			if cond.RolloutPercentage == 0 {
				return nil
			}
			rand.Seed(time.Now().UnixNano())
			randNum := rand.Intn(100)
			if randNum > cond.RolloutPercentage {
				return nil
			}
			if flag.FlagType == Single {
				return flagInfo{
					Key:       flag.FlagKey,
					IsPersist: flag.IsPersist,
					Value:     true,
					Payload:   flag.Payload,
				}
			}
			// Multi variant flag
			randNum = rand.Intn(100)
			prev, curr := 0, 0
			for _, variant := range flag.Variants {
				curr += variant.RolloutPercentage
				if randNum >= prev && randNum <= curr {
					return flagInfo{
						Key:       flag.FlagKey,
						IsPersist: flag.IsPersist,
						Value:     variant.Value,
						Payload:   variant.Payload,
					}
				}
				prev = curr
			}
		}
	}
	return nil
}

func ComputeFeatureFlags(flags []*FeatureFlag, sessInfo *FeatureFlagsRequest) ([]interface{}, error) {
	result := make([]interface{}, 0, len(flags))

	for _, flag := range flags {
		if val, ok := sessInfo.PersistFlags[flag.FlagKey]; ok && flag.IsPersist {
			if flag.FlagType == Single {
				result = append(result, flagInfo{
					Key:       flag.FlagKey,
					IsPersist: flag.IsPersist,
					Value:     val,
					Payload:   flag.Payload,
				})
				continue
			} else {
				found := false
				for _, variant := range flag.Variants {
					if variant.Value == val {
						found = true
						result = append(result, flagInfo{
							Key:       flag.FlagKey,
							IsPersist: flag.IsPersist,
							Value:     val,
							Payload:   variant.Payload,
						})
						break
					}
				}
				if found {
					continue
				}
			}
		}
		if computedFlag := ComputeFlagValue(flag, sessInfo); computedFlag != nil {
			result = append(result, computedFlag)
		}
	}
	return result, nil
}
