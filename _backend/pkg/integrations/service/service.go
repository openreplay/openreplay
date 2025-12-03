package service

import (
	"bytes"
	"context"
	"errors"
	"fmt"

	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/integrations/clients"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/objectstorage"
)

var PROVIDERS = []string{"datadog", "sentry", "elasticsearch", "dynatrace"}

func isValidProviderName(provider string) bool {
	for _, p := range PROVIDERS {
		if p == provider {
			return true
		}
	}
	return false
}

// Service is the interface that provides methods for backend logs integrations (DataDog, etc).
type Service interface {
	AddIntegration(projectID uint64, provider string, data interface{}) error
	UpdateIntegration(projectID uint64, provider string, data interface{}) error
	GetIntegration(projectID uint64, provider string) (interface{}, error)
	DeleteIntegration(projectID uint64, provider string) error
	GetSessionDataURL(projectID uint64, provider string, sessionID uint64) (string, error)
}

type serviceImpl struct {
	log     logger.Logger
	conn    pool.Pool
	storage objectstorage.ObjectStorage
}

func (s *serviceImpl) AddIntegration(projectID uint64, provider string, data interface{}) error {
	switch {
	case projectID == 0:
		return errors.New("project_id is empty")
	case provider == "":
		return errors.New("provider is empty")
	case !isValidProviderName(provider):
		return errors.New("invalid provider name")
	case data == nil:
		return errors.New("data is empty")
	}
	sql := `INSERT INTO public.integrations (project_id, provider, options) VALUES ($1, $2, $3)`
	if err := s.conn.Exec(sql, projectID, provider, data); err != nil {
		return fmt.Errorf("failed to add integration: %v", err)
	}
	// Check that provided credentials are valid
	_, err := s.fetchSessionData(provider, data, 0)
	if err != nil {
		return fmt.Errorf("failed to validate provider credentials: %v", err)
	}
	return nil
}

func (s *serviceImpl) GetIntegration(projectID uint64, provider string) (interface{}, error) {
	switch {
	case projectID == 0:
		return nil, errors.New("project_id is empty")
	case provider == "":
		return nil, errors.New("provider is empty")
	case !isValidProviderName(provider):
		return nil, errors.New("invalid provider name")
	}
	sql := `SELECT options FROM public.integrations WHERE project_id = $1 AND provider = $2`
	var options interface{}
	if err := s.conn.QueryRow(sql, projectID, provider).Scan(&options); err != nil {
		return nil, fmt.Errorf("failed to get integration: %v", err)
	}
	return options, nil
}

func (s *serviceImpl) UpdateIntegration(projectID uint64, provider string, data interface{}) error {
	switch {
	case projectID == 0:
		return errors.New("project_id is empty")
	case provider == "":
		return errors.New("provider is empty")
	case !isValidProviderName(provider):
		return errors.New("invalid provider name")
	case data == nil:
		return errors.New("data is empty")
	}
	sql := `UPDATE public.integrations SET options = $1 WHERE project_id = $2 AND provider = $3`
	if err := s.conn.Exec(sql, data, projectID, provider); err != nil {
		return fmt.Errorf("failed to update integration: %v", err)
	}
	return nil
}

func (s *serviceImpl) DeleteIntegration(projectID uint64, provider string) error {
	switch {
	case projectID == 0:
		return errors.New("project_id is empty")
	case provider == "":
		return errors.New("provider is empty")
	case !isValidProviderName(provider):
		return errors.New("invalid provider name")
	}
	sql := `DELETE FROM public.integrations WHERE project_id = $1 AND provider = $2`
	if err := s.conn.Exec(sql, projectID, provider); err != nil {
		return fmt.Errorf("failed to delete integration: %v", err)
	}
	return nil
}

func (s *serviceImpl) GetSessionDataURL(projectID uint64, provider string, sessionID uint64) (string, error) {
	switch {
	case projectID == 0:
		return "", errors.New("project_id is empty")
	case provider == "":
		return "", errors.New("provider is empty")
	case !isValidProviderName(provider):
		return "", errors.New("invalid provider name")
	case sessionID == 0:
		return "", errors.New("session_id is empty")
	}
	if s.hasSessionData(projectID, provider, sessionID) {
		return s.generateSessionDataURL(provider, sessionID)
	}
	creds, err := s.getProviderCredentials(projectID, provider)
	if err != nil {
		return "", fmt.Errorf("failed to get provider credentials: %v", err)
	}
	data, err := s.fetchSessionData(provider, creds, sessionID)
	if err != nil {
		return "", fmt.Errorf("failed to fetch session data: %v", err)
	}
	if err := s.uploadSessionData(provider, sessionID, data); err != nil {
		return "", fmt.Errorf("failed to upload session data to s3: %v", err)
	}
	if err := s.markSessionData(projectID, provider, sessionID); err != nil {
		s.log.Warn(context.Background(), "failed to mark session data: %v", err)
	}
	return s.generateSessionDataURL(provider, sessionID)
}

func (s *serviceImpl) hasSessionData(projectID uint64, provider string, sessionID uint64) bool {
	sql := `SELECT EXISTS(SELECT 1 FROM session_integrations WHERE project_id = $1 AND provider = $2 AND session_id = $3)`
	val := false
	if err := s.conn.QueryRow(sql, projectID, provider, sessionID).Scan(&val); err != nil {
		s.log.Error(context.Background(), "failed to check session data existence: %v", err)
		return false
	}
	return val
}

func (s *serviceImpl) getProviderCredentials(projectID uint64, provider string) (interface{}, error) {
	sql := `SELECT options FROM public.integrations WHERE project_id = $1 AND provider = $2`
	var credentials interface{}
	if err := s.conn.QueryRow(sql, projectID, provider).Scan(&credentials); err != nil {
		return nil, fmt.Errorf("failed to get provider credentials: %v", err)
	}
	return credentials, nil
}

func (s *serviceImpl) fetchSessionData(provider string, credentials interface{}, sessionID uint64) (interface{}, error) {
	var newClient clients.Client
	switch provider {
	case "datadog":
		newClient = clients.NewDataDogClient()
	case "sentry":
		newClient = clients.NewSentryClient()
	case "elasticsearch":
		newClient = clients.NewElasticClient()
	case "dynatrace":
		newClient = clients.NewDynatraceClient()
	default:
		return nil, fmt.Errorf("unknown provider: %s", provider)
	}
	return newClient.FetchSessionData(credentials, sessionID)
}

func (s *serviceImpl) uploadSessionData(provider string, sessionID uint64, data interface{}) error {
	key := fmt.Sprintf("%d/%s.logs", sessionID, provider)
	dataBytes, _ := data.([]byte)
	return s.storage.Upload(bytes.NewReader(dataBytes), key, "text/plain", objectstorage.NoContentEncoding, objectstorage.NoCompression)
}

func (s *serviceImpl) markSessionData(projectID uint64, provider string, sessionID uint64) error {
	sql := `INSERT INTO session_integrations (project_id, provider, session_id) VALUES ($1, $2, $3)`
	if err := s.conn.Exec(sql, projectID, provider, sessionID); err != nil {
		return fmt.Errorf("failed to mark session data: %v", err)
	}
	return nil
}

func (s *serviceImpl) generateSessionDataURL(provider string, sessionID uint64) (string, error) {
	key := fmt.Sprintf("%d/%s.logs", sessionID, provider)
	dataURL, err := s.storage.GetPreSignedDownloadUrl(key)
	if err != nil {
		return "", fmt.Errorf("failed to generate session data URL: %v", err)
	}
	return dataURL, nil
}

func NewService(log logger.Logger, pgConn pool.Pool, objStorage objectstorage.ObjectStorage) (Service, error) {
	switch {
	case log == nil:
		return nil, errors.New("logger is empty")
	case pgConn == nil:
		return nil, errors.New("postgres connection is empty")
	case objStorage == nil:
		return nil, errors.New("object storage is empty")
	}
	return &serviceImpl{
		log:     log,
		conn:    pgConn,
		storage: objStorage,
	}, nil
}
