package favorite

import (
	"openreplay/backend/pkg/objectstorage"
)

func setTags(objStorage objectstorage.ObjectStorage, sessionID uint64, toDelete bool) {}

func (f *favoritesImpl) updateClickHouseVault(projectID uint32, sessionID uint64, isVault bool) error {
	return nil
}
