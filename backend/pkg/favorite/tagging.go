package favorite

import (
	"context"
	"openreplay/backend/pkg/objectstorage"
)

func setTags(objStorage objectstorage.ObjectStorage, sessionID uint64, toDelete bool) {}

func (f *favoritesImpl) updateVaultStatus(ctx context.Context, projectID uint32, sessionID uint64, isVault bool) error {
	return nil
}
