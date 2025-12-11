package clients

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/DataDog/datadog-api-client-go/v2/api/datadog"
	"github.com/DataDog/datadog-api-client-go/v2/api/datadogV2"
)

type dataDogClient struct{}

func NewDataDogClient() Client {
	return &dataDogClient{}
}

type datadogConfig struct {
	Site   string `json:"site"`
	ApiKey string `json:"api_key"`
	AppKey string `json:"app_key"`
}

func (d *dataDogClient) FetchSessionData(credentials interface{}, sessionID uint64) (interface{}, error) {
	cfg, ok := credentials.(datadogConfig)
	if !ok {
		// Not a struct, will try to parse as JSON string
		strCfg, ok := credentials.(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("invalid credentials")
		}
		cfg = datadogConfig{}
		if site, ok := strCfg["site"].(string); ok {
			cfg.Site = site
		}
		if apiKey, ok := strCfg["api_key"].(string); ok {
			cfg.ApiKey = apiKey
		}
		if appKey, ok := strCfg["app_key"].(string); ok {
			cfg.AppKey = appKey
		}
	}
	body := datadogV2.LogsListRequest{
		Filter: &datadogV2.LogsQueryFilter{
			Indexes: []string{
				"main",
			},
		},
		Sort: datadogV2.LOGSSORT_TIMESTAMP_ASCENDING.Ptr(),
		Page: &datadogV2.LogsListRequestPage{
			Limit: datadog.PtrInt32(1),
		},
	}
	if sessionID != 0 {
		body.Filter.Query = datadog.PtrString(fmt.Sprintf("openReplaySession.id=%d", sessionID))
		body.Page.Limit = datadog.PtrInt32(1000)
	}
	ctx := context.WithValue(context.Background(), datadog.ContextServerVariables, map[string]string{"site": cfg.Site})
	ctx = context.WithValue(ctx, datadog.ContextAPIKeys, map[string]datadog.APIKey{
		"apiKeyAuth": {Key: cfg.ApiKey},
		"appKeyAuth": {Key: cfg.AppKey},
	})
	configuration := datadog.NewConfiguration()
	apiClient := datadog.NewAPIClient(configuration)
	api := datadogV2.NewLogsApi(apiClient)
	resp, r, err := api.ListLogs(ctx, *datadogV2.NewListLogsOptionalParameters().WithBody(body))

	if err != nil {
		fmt.Printf("error when calling `LogsApi.ListLogs`: %v", err)
		fmt.Printf("full HTTP response: %v\n", r)
	}

	logs := resp.Data
	if logs == nil || len(logs) == 0 {
		return nil, fmt.Errorf("no logs found")
	}
	responseContent, _ := json.Marshal(logs)
	return responseContent, nil
}
