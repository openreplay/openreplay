package favorite

import (
	"fmt"
	"openreplay/backend/pkg/env"
	"openreplay/backend/pkg/objectstorage"
)

func getMobFileNames(sessionID uint64) []string {
	return []string{
		fmt.Sprintf("%d/dom.mobs", sessionID),
		fmt.Sprintf("%d/dom.mobe", sessionID),
		fmt.Sprintf("%d/devtools.mob", sessionID),
	}
}

func setTags(objStorage objectstorage.ObjectStorage, sessionID uint64, toDelete bool) {
	if objStorage == nil {
		return
	}
	var tagValue string
	if toDelete {
		tagValue = env.StringDefault("RETENTION_D_VALUE", "default")
	} else {
		tagValue = env.StringDefault("RETENTION_L_VALUE", "vault")
	}
	for _, fileName := range getMobFileNames(sessionID) {
		if err := objStorage.Tag(fileName, "retention", tagValue); err != nil {
			fmt.Printf("Error tagging file %s with value %s: %s\n", fileName, tagValue, err)
		}
	}
}
