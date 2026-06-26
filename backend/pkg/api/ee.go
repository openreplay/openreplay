package api

import "openreplay/backend/pkg/server/api"

// Overlaid by ee/backend/pkg/api/ee.go in EE builds; keep shared types in extensions.go.
func eeServices(_ eeDeps) ([]api.Handlers, []Worker, error) {
	return nil, nil, nil
}
