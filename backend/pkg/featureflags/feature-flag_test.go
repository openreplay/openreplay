package featureflags

import (
	"bytes"
	"log"
	"math/rand"
	"os"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgtype"
)

func TestNumArrayToIntSlice(t *testing.T) {
	// Test case 1: Valid array
	arr1 := &pgtype.EnumArray{
		Elements: []pgtype.GenericText{
			{String: "10"},
			{String: "20"},
			{String: "30"},
		},
		Dimensions: []pgtype.ArrayDimension{{Length: 3}},
	}
	expected1 := []int{10, 20, 30}

	result1 := numArrayToIntSlice(arr1)
	if !reflect.DeepEqual(result1, expected1) {
		t.Errorf("Expected %v, but got %v", expected1, result1)
	}

	// Test case 2: Empty array
	arr2 := &pgtype.EnumArray{
		Elements:   []pgtype.GenericText{},
		Dimensions: []pgtype.ArrayDimension{{Length: 0}},
	}
	expected2 := []int{}

	result2 := numArrayToIntSlice(arr2)
	if !reflect.DeepEqual(result2, expected2) {
		t.Errorf("Expected %v, but got %v", expected2, result2)
	}

	// Test case 3: Invalid number
	arr3 := &pgtype.EnumArray{
		Elements: []pgtype.GenericText{
			{String: "10"},
			{String: "20"},
			{String: "invalid"},
			{String: "30"},
		},
		Dimensions: []pgtype.ArrayDimension{{Length: 4}},
	}
	expected3 := []int{10, 20, 0, 30}

	// Capture the log output for the invalid number
	logBuffer := &bytes.Buffer{}
	log.SetOutput(logBuffer)
	defer log.SetOutput(os.Stderr)

	result3 := numArrayToIntSlice(arr3)
	if !reflect.DeepEqual(result3, expected3) {
		t.Errorf("Expected %v, but got %v", expected3, result3)
	}

	// Check the log output for the invalid number
	logOutput := logBuffer.String()
	if logOutput == "" {
		t.Error("Expected log output for invalid number, but got empty")
	}
	if !strings.Contains(logOutput, "strconv.Atoi: parsing \"invalid\": invalid syntax") {
		t.Errorf("Expected log output containing the error message, but got: %s", logOutput)
	}
}

func TestParseFlagConditions(t *testing.T) {
	// Test case 1: Valid conditions
	conditions1 := &pgtype.TextArray{
		Elements: []pgtype.Text{
			{String: `[{"type": "userCountry", "operator": "is", "source": "source1", "value": ["value1"]}]`},
			{String: `[{"type": "userCity", "operator": "contains", "source": "source2", "value": ["value2", "value3"]}]`},
		},
		Dimensions: []pgtype.ArrayDimension{{Length: 2}},
	}
	rolloutPercentages1 := &pgtype.EnumArray{
		Elements: []pgtype.GenericText{
			{String: "50"},
			{String: "30"},
		},
		Dimensions: []pgtype.ArrayDimension{{Length: 2}},
	}
	expected1 := []*FeatureFlagCondition{
		{
			Filters: []*FeatureFlagFilter{
				{
					Type:     UserCountry,
					Operator: Is,
					Source:   "source1",
					Values:   []string{"value1"},
				},
			},
			RolloutPercentage: 50,
		},
		{
			Filters: []*FeatureFlagFilter{
				{
					Type:     UserCity,
					Operator: Contains,
					Source:   "source2",
					Values:   []string{"value2", "value3"},
				},
			},
			RolloutPercentage: 30,
		},
	}

	result1, err1 := parseFlagConditions(conditions1, rolloutPercentages1)
	if err1 != nil {
		t.Errorf("Error parsing flag conditions: %v", err1)
	}
	if !reflect.DeepEqual(result1, expected1) {
		t.Errorf("Expected %v, but got %v", expected1, result1)
	}

	// Test case 2: Empty conditions array
	conditions2 := &pgtype.TextArray{
		Elements:   []pgtype.Text{},
		Dimensions: []pgtype.ArrayDimension{{Length: 0}},
	}
	rolloutPercentages2 := &pgtype.EnumArray{
		Elements:   []pgtype.GenericText{},
		Dimensions: []pgtype.ArrayDimension{{Length: 0}},
	}
	expected2 := []*FeatureFlagCondition{}

	result2, err2 := parseFlagConditions(conditions2, rolloutPercentages2)
	if err2 != nil {
		t.Errorf("Error parsing flag conditions: %v", err2)
	}
	if !reflect.DeepEqual(result2, expected2) {
		t.Errorf("Expected %v, but got %v", expected2, result2)
	}

	// Test case 3: Mismatched number of elements
	conditions3 := &pgtype.TextArray{
		Elements: []pgtype.Text{
			{String: `[{"type": "userCountry", "operator": "is", "source": "source1", "value": ["value1"]}]`},
			{String: `[{"type": "userCity", "operator": "contains", "source": "source2", "value": ["value2", "value3"]}]`},
		},
		Dimensions: []pgtype.ArrayDimension{{Length: 2}},
	}
	rolloutPercentages3 := &pgtype.EnumArray{
		Elements: []pgtype.GenericText{
			{String: "50"},
		},
		Dimensions: []pgtype.ArrayDimension{{Length: 1}},
	}
	expectedErrorMsg := "error: len(conditions.Elements) != len(percents)"
	if _, err3 := parseFlagConditions(conditions3, rolloutPercentages3); err3 == nil || err3.Error() != expectedErrorMsg {
		t.Errorf("Expected error: %v, but got: %v", expectedErrorMsg, err3)
	}
}

func TestParseFlagVariants(t *testing.T) {
	// Test case 1: Valid variants
	values1 := &pgtype.TextArray{
		Elements: []pgtype.Text{
			{String: "variant1"},
			{String: "variant2"},
			{String: "variant3"},
		},
		Dimensions: []pgtype.ArrayDimension{{Length: 3}},
	}
	payloads1 := &pgtype.TextArray{
		Elements: []pgtype.Text{
			{String: "payload1"},
			{String: "payload2"},
			{String: "payload3"},
		},
		Dimensions: []pgtype.ArrayDimension{{Length: 3}},
	}
	variantRollout1 := &pgtype.EnumArray{
		Elements: []pgtype.GenericText{
			{String: "50"},
			{String: "30"},
			{String: "20"},
		},
		Dimensions: []pgtype.ArrayDimension{{Length: 3}},
	}
	expected1 := []*FeatureFlagVariant{
		{Value: "variant1", Payload: "payload1", RolloutPercentage: 50},
		{Value: "variant2", Payload: "payload2", RolloutPercentage: 30},
		{Value: "variant3", Payload: "payload3", RolloutPercentage: 20},
	}

	result1, err1 := parseFlagVariants(values1, payloads1, variantRollout1)
	if err1 != nil {
		t.Errorf("Error parsing flag variants: %v", err1)
	}
	if !reflect.DeepEqual(result1, expected1) {
		t.Errorf("Expected %v, but got %v", expected1, result1)
	}

	// Test case 2: Empty values array
	values2 := &pgtype.TextArray{
		Elements:   []pgtype.Text{},
		Dimensions: []pgtype.ArrayDimension{{Length: 0}},
	}
	payloads2 := &pgtype.TextArray{
		Elements:   []pgtype.Text{},
		Dimensions: []pgtype.ArrayDimension{{Length: 0}},
	}
	variantRollout2 := &pgtype.EnumArray{
		Elements:   []pgtype.GenericText{},
		Dimensions: []pgtype.ArrayDimension{{Length: 0}},
	}
	expected2 := []*FeatureFlagVariant{}

	result2, err2 := parseFlagVariants(values2, payloads2, variantRollout2)
	if err2 != nil {
		t.Errorf("Error parsing flag variants: %v", err2)
	}
	if !reflect.DeepEqual(result2, expected2) {
		t.Errorf("Expected %v, but got %v", expected2, result2)
	}

	// Test case 3: Mismatched number of elements
	values3 := &pgtype.TextArray{
		Elements: []pgtype.Text{
			{String: "variant1"},
			{String: "variant2"},
		},
		Dimensions: []pgtype.ArrayDimension{{Length: 2}},
	}
	payloads3 := &pgtype.TextArray{
		Elements: []pgtype.Text{
			{String: "payload1"},
			{String: "payload2"},
			{String: "payload3"},
		},
		Dimensions: []pgtype.ArrayDimension{{Length: 3}},
	}
	variantRollout3 := &pgtype.EnumArray{
		Elements: []pgtype.GenericText{
			{String: "50"},
			{String: "30"},
		},
		Dimensions: []pgtype.ArrayDimension{{Length: 2}},
	}

	result3, err3 := parseFlagVariants(values3, payloads3, variantRollout3)
	expectedErrorMsg := "wrong number of variant elements"
	if err3 == nil || err3.Error() != expectedErrorMsg {
		t.Errorf("Expected error: %v, but got: %v", expectedErrorMsg, err3)
	}
	if result3 != nil {
		t.Errorf("Expected nil result, but got: %v", result3)
	}
}

func TestParseFeatureFlag(t *testing.T) {
	// Test case 1: Single flag with no variants
	rawFlag1 := &FeatureFlagPG{
		FlagID:             1,
		FlagKey:            "flag_key",
		FlagType:           "single",
		IsPersist:          true,
		Payload:            nil,
		RolloutPercentages: pgtype.EnumArray{},
		Filters:            pgtype.TextArray{},
		Values:             pgtype.TextArray{},
		Payloads:           pgtype.TextArray{},
		VariantRollout:     pgtype.EnumArray{},
	}
	expectedFlag1 := &FeatureFlag{
		FlagID:     1,
		FlagKey:    "flag_key",
		FlagType:   Single,
		IsPersist:  true,
		Payload:    "",
		Conditions: []*FeatureFlagCondition{},
		Variants:   []*FeatureFlagVariant{},
	}

	resultFlag1, err := ParseFeatureFlag(rawFlag1)
	if err != nil {
		t.Errorf("Error parsing feature flag: %v", err)
	}
	if !reflect.DeepEqual(resultFlag1, expectedFlag1) {
		t.Errorf("Expected %v, but got %v", expectedFlag1, resultFlag1)
	}

	// Test case 2: Multi flag with variants
	rawFlag2 := &FeatureFlagPG{
		FlagID:    2,
		FlagKey:   "flag_key",
		FlagType:  "multi",
		IsPersist: false,
		Payload:   nil,
		RolloutPercentages: pgtype.EnumArray{
			Elements: []pgtype.GenericText{
				{String: "70"},
				{String: "90"},
			},
		},
		Filters: pgtype.TextArray{
			Elements: []pgtype.Text{
				{String: `[{"type":"userCountry","operator":"is","source":"","value":["US"]},{"type":"userCity","operator":"startsWith","source":"cookie","value":["New York"]},{"type":"referrer","operator":"contains","source":"header","value":["google.com"]},{"type":"metadata","operator":"is","source":"","value":["some_value"]}]`},
				{String: `[{"type":"userCountry","operator":"is","source":"","value":["CA"]}]`},
			},
		},
		Values: pgtype.TextArray{
			Elements: []pgtype.Text{
				{String: "value1"},
				{String: "value2"},
			},
		},
		Payloads: pgtype.TextArray{
			Elements: []pgtype.Text{
				{String: "payload1"},
				{String: "payload2"},
			},
		},
		VariantRollout: pgtype.EnumArray{
			Elements: []pgtype.GenericText{
				{String: "50"},
				{String: "50"},
			},
		},
	}
	expectedFlag2 := &FeatureFlag{
		FlagID:    2,
		FlagKey:   "flag_key",
		FlagType:  Multi,
		IsPersist: false,
		Payload:   "",
		Conditions: []*FeatureFlagCondition{
			{
				Filters: []*FeatureFlagFilter{
					{
						Type:     UserCountry,
						Operator: Is,
						Source:   "",
						Values:   []string{"US"},
					},
					{
						Type:     UserCity,
						Operator: StartsWith,
						Source:   "cookie",
						Values:   []string{"New York"},
					},
					{
						Type:     Referrer,
						Operator: Contains,
						Source:   "header",
						Values:   []string{"google.com"},
					},
					{
						Type:     Metadata,
						Operator: Is,
						Source:   "",
						Values:   []string{"some_value"},
					},
				},
				RolloutPercentage: 70,
			},
			{
				Filters: []*FeatureFlagFilter{
					{
						Type:     UserCountry,
						Operator: Is,
						Source:   "",
						Values:   []string{"CA"},
					},
				},
				RolloutPercentage: 90,
			},
		},
		Variants: []*FeatureFlagVariant{
			{
				Value:             "value1",
				Payload:           "payload1",
				RolloutPercentage: 50,
			},
			{
				Value:             "value2",
				Payload:           "payload2",
				RolloutPercentage: 50,
			},
		},
	}

	resultFlag2, err := ParseFeatureFlag(rawFlag2)
	if err != nil {
		t.Errorf("Error parsing feature flag: %v", err)
	}
	if !reflect.DeepEqual(resultFlag2, expectedFlag2) {
		t.Errorf("Expected %v, but got %v", expectedFlag2, resultFlag2)
	}
}

func TestCheckCondition(t *testing.T) {
	// Test case 1: Operator - Is, varValue is equal to one of the exprValues
	varValue := "Hello"
	exprValues := []string{"Hello", "Goodbye"}
	operator := Is
	expected := true
	result := checkCondition(varValue, exprValues, operator)
	if result != expected {
		t.Errorf("Expected %v, but got %v", expected, result)
	}

	// Test case 2: Operator - Is, varValue is not equal to any of the exprValues
	varValue = "Foo"
	expected = false
	result = checkCondition(varValue, exprValues, operator)
	if result != expected {
		t.Errorf("Expected %v, but got %v", expected, result)
	}

	// Test case 3: Operator - IsNot, varValue is equal to one of the exprValues
	varValue = "Hello"
	operator = IsNot
	expected = false
	result = checkCondition(varValue, exprValues, operator)
	if result != expected {
		t.Errorf("Expected %v, but got %v", expected, result)
	}

	// Test case 4: Operator - IsNot, varValue is not equal to any of the exprValues
	varValue = "Foo"
	expected = true
	result = checkCondition(varValue, exprValues, operator)
	if result != expected {
		t.Errorf("Expected %v, but got %v", expected, result)
	}

	// Test case 5: Operator - IsAny, varValue is not empty
	varValue = "Hello"
	operator = IsAny
	expected = true
	result = checkCondition(varValue, exprValues, operator)
	if result != expected {
		t.Errorf("Expected %v, but got %v", expected, result)
	}

	// Test case 6: Operator - IsAny, varValue is empty
	varValue = ""
	expected = false
	result = checkCondition(varValue, exprValues, operator)
	if result != expected {
		t.Errorf("Expected %v, but got %v", expected, result)
	}

	// Test case 7: Operator - Contains, varValue contains one of the exprValues
	varValue = "Hello, World!"
	operator = Contains
	expected = true
	result = checkCondition(varValue, exprValues, operator)
	if result != expected {
		t.Errorf("Expected %v, but got %v", expected, result)
	}

	// Test case 8: Operator - Contains, varValue does not contain any of the exprValues
	varValue = "Foo Bar"
	expected = false
	result = checkCondition(varValue, exprValues, operator)
	if result != expected {
		t.Errorf("Expected %v, but got %v", expected, result)
	}

	// Test case 9: Operator - NotContains, varValue contains one of the exprValues
	varValue = "Hello, World!"
	operator = NotContains
	expected = false
	result = checkCondition(varValue, exprValues, operator)
	if result != expected {
		t.Errorf("Expected %v, but got %v", expected, result)
	}

	// Test case 10: Operator - NotContains, varValue does not contain any of the exprValues
	varValue = "Foo Bar"
	expected = true
	result = checkCondition(varValue, exprValues, operator)
	if result != expected {
		t.Errorf("Expected %v, but got %v", expected, result)
	}

	// Test case 11: Operator - StartsWith, varValue starts with one of the exprValues
	varValue = "Hello, World!"
	operator = StartsWith
	expected = true
	result = checkCondition(varValue, exprValues, operator)
	if result != expected {
		t.Errorf("Expected %v, but got %v", expected, result)
	}

	// Test case 12: Operator - StartsWith, varValue does not start with any of the exprValues
	varValue = "Foo Bar"
	expected = false
	result = checkCondition(varValue, exprValues, operator)
	if result != expected {
		t.Errorf("Expected %v, but got %v", expected, result)
	}

	// Test case 13: Operator - EndsWith, varValue ends with one of the exprValues
	varValue = "Tom! Hello"
	operator = EndsWith
	expected = true
	result = checkCondition(varValue, exprValues, operator)
	if result != expected {
		t.Errorf("Expected %v, but got %v", expected, result)
	}

	// Test case 14: Operator - EndsWith, varValue does not end with any of the exprValues
	varValue = "Foo Bar"
	expected = false
	result = checkCondition(varValue, exprValues, operator)
	if result != expected {
		t.Errorf("Expected %v, but got %v", expected, result)
	}

	// Test case 15: Operator - IsUndefined, varValue is empty
	varValue = ""
	operator = IsUndefined
	expected = true
	result = checkCondition(varValue, exprValues, operator)
	if result != expected {
		t.Errorf("Expected %v, but got %v", expected, result)
	}

	// Test case 16: Operator - IsUndefined, varValue is not empty
	varValue = "Hello"
	expected = false
	result = checkCondition(varValue, exprValues, operator)
	if result != expected {
		t.Errorf("Expected %v, but got %v", expected, result)
	}
}

func TestComputeFlagValue(t *testing.T) {
	rand.Seed(time.Now().UnixNano())

	// Test case 1: Single flag, condition true, rollout percentage 100
	flag1 := &FeatureFlag{
		FlagID:    1,
		FlagKey:   "flag_key",
		FlagType:  Single,
		IsPersist: true,
		Payload:   "payload",
		Conditions: []*FeatureFlagCondition{
			{
				Filters: []*FeatureFlagFilter{
					{
						Type:     UserCountry,
						Operator: Is,
						Source:   "",
						Values:   []string{"US"},
					},
				},
				RolloutPercentage: 100,
			},
		},
		Variants: []*FeatureFlagVariant{},
	}
	sessInfo1 := &FeatureFlagsRequest{
		UserCountry: "US",
	}

	expectedResult1 := flagInfo{
		Key:       "flag_key",
		IsPersist: true,
		Value:     true,
		Payload:   "payload",
	}

	result1 := ComputeFlagValue(flag1, sessInfo1)
	if result1 == nil {
		t.Errorf("Expected %v, but got nil", expectedResult1)
	} else if !reflect.DeepEqual(result1, expectedResult1) {
		t.Errorf("Expected %v, but got %v", expectedResult1, result1)
	}

	// Test case 2: Single flag, condition false, rollout percentage 100
	flag2 := &FeatureFlag{
		FlagID:    2,
		FlagKey:   "flag_key",
		FlagType:  Single,
		IsPersist: false,
		Payload:   "payload",
		Conditions: []*FeatureFlagCondition{
			{
				Filters: []*FeatureFlagFilter{
					{
						Type:     UserCountry,
						Operator: Is,
						Source:   "",
						Values:   []string{"US"},
					},
				},
				RolloutPercentage: 100,
			},
		},
		Variants: []*FeatureFlagVariant{},
	}
	sessInfo2 := &FeatureFlagsRequest{
		UserCountry: "CA",
	}

	result2 := ComputeFlagValue(flag2, sessInfo2)
	if result2 != nil {
		t.Errorf("Expected nil, but got %v", result2)
	}

	// Test case 3: Multi variant flag, condition true, rollout percentage 100
	flag3 := &FeatureFlag{
		FlagID:    3,
		FlagKey:   "flag_key",
		FlagType:  Multi,
		IsPersist: true,
		Payload:   "payload",
		Conditions: []*FeatureFlagCondition{
			{
				Filters: []*FeatureFlagFilter{
					{
						Type:     UserCountry,
						Operator: Is,
						Source:   "",
						Values:   []string{"US"},
					},
				},
				RolloutPercentage: 100,
			},
		},
		Variants: []*FeatureFlagVariant{
			{
				Value:             "value1",
				Payload:           "payload1",
				RolloutPercentage: 50,
			},
			{
				Value:             "value2",
				Payload:           "payload2",
				RolloutPercentage: 50,
			},
		},
	}
	sessInfo3 := &FeatureFlagsRequest{
		UserCountry: "US",
	}

	expectedResult3 := flagInfo{
		Key:       "flag_key",
		IsPersist: true,
		Value:     "value1",
		Payload:   "payload1",
	}

	result3 := ComputeFlagValue(flag3, sessInfo3)
	if result3 == nil {
		t.Errorf("Expected %v, but got nil", expectedResult3)
	} else if !reflect.DeepEqual(result3, expectedResult3) {
		t.Errorf("Expected %v, but got %v", expectedResult3, result3)
	}

	// Test case 4: Multi variant flag, condition true, rollout percentage 0
	flag4 := &FeatureFlag{
		FlagID:    4,
		FlagKey:   "flag_key",
		FlagType:  Multi,
		IsPersist: false,
		Payload:   "payload",
		Conditions: []*FeatureFlagCondition{
			{
				Filters: []*FeatureFlagFilter{
					{
						Type:     UserCountry,
						Operator: Is,
						Source:   "",
						Values:   []string{"US"},
					},
				},
				RolloutPercentage: 0,
			},
		},
		Variants: []*FeatureFlagVariant{
			{
				Value:             "value1",
				Payload:           "payload1",
				RolloutPercentage: 50,
			},
			{
				Value:             "value2",
				Payload:           "payload2",
				RolloutPercentage: 50,
			},
		},
	}
	sessInfo4 := &FeatureFlagsRequest{
		UserCountry: "US",
	}

	result4 := ComputeFlagValue(flag4, sessInfo4)
	if result4 != nil {
		t.Errorf("Expected nil, but got %v", result4)
	}
}

func TestComputeFeatureFlags(t *testing.T) {
	// Initialize test cases
	var testCases = []struct {
		name           string
		flags          []*FeatureFlag
		sessInfo       *FeatureFlagsRequest
		expectedOutput []interface{}
		expectedError  error
	}{
		{
			"Persist flag with FlagType Single",
			[]*FeatureFlag{
				{
					FlagKey:   "testFlag",
					FlagType:  Single,
					IsPersist: true,
					Payload:   "testPayload",
				},
			},
			&FeatureFlagsRequest{
				PersistFlags: map[string]interface{}{
					"testFlag": "testValue",
				},
			},
			[]interface{}{
				flagInfo{
					Key:       "testFlag",
					IsPersist: true,
					Value:     "testValue",
					Payload:   "testPayload",
				},
			},
			nil,
		},
		{
			"Persist flag with FlagType Multi and variant match",
			[]*FeatureFlag{
				{
					FlagKey:   "testFlag",
					FlagType:  Multi,
					IsPersist: true,
					Variants: []*FeatureFlagVariant{
						{
							Value:   "testValue",
							Payload: "testPayload",
						},
					},
				},
			},
			&FeatureFlagsRequest{
				PersistFlags: map[string]interface{}{
					"testFlag": "testValue",
				},
			},
			[]interface{}{
				flagInfo{
					Key:       "testFlag",
					IsPersist: true,
					Value:     "testValue",
					Payload:   "testPayload",
				},
			},
			nil,
		},
	}

	// Execute test cases
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			output, err := ComputeFeatureFlags(tc.flags, tc.sessInfo)
			reflect.DeepEqual(tc.expectedError, err)
			reflect.DeepEqual(tc.expectedOutput, output)
		})
	}
}

func TestFeatureFlags(t *testing.T) {
	flags := []*FeatureFlag{
		{
			FlagID:    1,
			FlagKey:   "checkCity",
			FlagType:  Single,
			IsPersist: true,
			Payload:   "test",
			Conditions: []*FeatureFlagCondition{
				{
					Filters: []*FeatureFlagFilter{
						{
							Type:     UserCity,
							Operator: Contains,
							Values:   []string{"Paris"},
						},
					},
					RolloutPercentage: 80,
				},
			},
			Variants: []*FeatureFlagVariant{
				{
					Value:             "blue",
					Payload:           "{\"color\": \"blue\"}",
					RolloutPercentage: 50,
				},
				{
					Value:             "red",
					Payload:           "{\"color\": \"red\"}",
					RolloutPercentage: 50,
				},
			},
		},
	}
	sessInfo := FeatureFlagsRequest{
		ProjectID:    "123",
		UserOS:       "macos",
		UserDevice:   "macbook",
		UserCountry:  "France",
		UserState:    "Ile-de-France",
		UserCity:     "Paris",
		UserBrowser:  "Safari",
		Referrer:     "https://google.com",
		UserID:       "456",
		Metadata:     map[string]string{"test": "test"},
		PersistFlags: map[string]interface{}{"test": "test"},
	}

	result, err := ComputeFeatureFlags(flags, &sessInfo)
	if err != nil {
		t.Error(err)
	}
	t.Log(result)
}
