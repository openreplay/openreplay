package assist

import (
	"context"
	"errors"
	"strconv"
	"strings"

	config "openreplay/backend/internal/config/api"
	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/projects"
	"openreplay/backend/pkg/sessionmanager"
)

type directImpl struct {
	log      logger.Logger
	cfg      *config.Config
	projects projects.Projects
	sessions sessionmanager.SessionManager
}

func newDirect(log logger.Logger, cfg *config.Config, projects projects.Projects, sessions sessionmanager.SessionManager) Assist {
	return &directImpl{
		log:      log,
		cfg:      cfg,
		projects: projects,
		sessions: sessions,
	}
}

func (a *directImpl) GetLiveSessionByID(projID uint32, sessID uint64) (interface{}, error) {
	switch {
	case projID == 0:
		return nil, errors.New("projID is 0")
	case sessID == 0:
		return nil, errors.New("sessID is 0")
	}

	proj, err := a.projects.GetProject(projID)
	if err != nil {
		if postgres.IsNoRowsErr(err) {
			return nil, ErrNoLiveSession
		}
		return nil, err
	}

	raw, err := a.sessions.GetByID(projectIDKey(projID), strconv.FormatUint(sessID, 10))
	if err != nil {
		if errors.Is(err, sessionmanager.ErrSessionNotFound) || errors.Is(err, sessionmanager.ErrSessionNotBelongToProject) {
			return nil, ErrNoLiveSession
		}
		return nil, err
	}
	session, ok := raw.(map[string]interface{})
	if !ok || len(session) == 0 {
		return nil, ErrNoLiveSession
	}

	data := make(map[string]interface{}, len(session)+2)
	for k, v := range session {
		data[k] = v
	}
	data["live"] = true
	if token, err := agentToken(a.cfg, projID, proj.ProjectKey, sessID); err != nil {
		a.log.Error(context.Background(), "[assist] GetLiveSessionByID: %v", err)
	} else {
		data["agentToken"] = token
	}
	return data, nil
}

func (a *directImpl) GetLiveSessionsWS(projID uint32, req *GetLiveSessionsRequest) (interface{}, error) {
	switch {
	case projID == 0:
		return nil, errors.New("projID is 0")
	case req == nil:
		return nil, errors.New("request body is nil")
	}

	if _, err := a.projects.GetProject(projID); err != nil {
		return nil, err
	}

	order := sessionmanager.Asc
	if strings.ToLower(req.Order) == "desc" {
		order = sessionmanager.Desc
	}

	sessions, total, counter, err := a.sessions.GetAll(projectIDKey(projID), parseFilters(req.Filters), order, req.Page, req.Limit)
	if err != nil {
		a.log.Error(context.Background(), "Error requesting assist data: %v", err)
		return map[string]interface{}{"total": 0, "sessions": []interface{}{}}, nil
	}
	return map[string]interface{}{
		"data": map[string]interface{}{
			"total":    total,
			"counter":  counter,
			"sessions": sessions,
		},
	}, nil
}

func (a *directImpl) IsLive(projID uint32, sessID uint64) (bool, error) {
	switch {
	case projID == 0:
		return false, errors.New("projID is 0")
	case sessID == 0:
		return false, errors.New("sessID is 0")
	}
	_, err := a.sessions.GetByID(projectIDKey(projID), strconv.FormatUint(sessID, 10))
	if err != nil {
		if errors.Is(err, sessionmanager.ErrSessionNotFound) || errors.Is(err, sessionmanager.ErrSessionNotBelongToProject) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (a *directImpl) Autocomplete(projID uint32, q, key string) ([]map[string]interface{}, error) {
	switch {
	case projID == 0:
		return nil, errors.New("projID is 0")
	case key == "":
		return nil, errors.New("key is required")
	}

	entries, err := a.sessions.Autocomplete(projectIDKey(projID), sessionmanager.FilterType(key), q)
	if err != nil {
		return nil, err
	}
	results := make([]map[string]interface{}, 0, len(entries))
	for _, e := range entries {
		results = append(results, map[string]interface{}{
			"type":  changeAssistKey(e.Type),
			"value": e.Value,
		})
	}
	return results, nil
}

func projectIDKey(projID uint32) string {
	return strconv.FormatUint(uint64(projID), 10)
}

func parseFilters(filters []interface{}) []*sessionmanager.Filter {
	res := make([]*sessionmanager.Filter, 0, len(filters))
	for _, filter := range filters {
		f, ok := filter.(map[string]interface{})
		if !ok {
			continue
		}
		name, _ := f["name"].(string) // it was 'type'
		if strings.HasPrefix(name, "metadata_") {
			name, _ = f["source"].(string) // temp hack with a frontend support
		}
		if name == "" {
			continue
		}
		operator, _ := f["operator"].(string)
		op := sessionmanager.Contains
		if operator == "is" {
			op = sessionmanager.Is
		}
		res = append(res, &sessionmanager.Filter{
			Type:     sessionmanager.FilterType(name),
			Value:    toStringSlice(f["value"]),
			Operator: op,
		})
	}
	return res
}

func toStringSlice(value interface{}) []string {
	switch v := value.(type) {
	case []string:
		return v
	case []interface{}:
		res := make([]string, 0, len(v))
		for _, item := range v {
			if s, ok := item.(string); ok {
				res = append(res, s)
			}
		}
		return res
	case string:
		return []string{v}
	}
	return nil
}
