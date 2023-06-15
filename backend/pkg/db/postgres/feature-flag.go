package postgres

type FeatureFlagCondition struct {
	RolloutPercentage int
	Filters           []map[string]interface{}
}

type FeatureFlag struct {
	FlagID     uint32
	FlagKey    string
	FlagType   string
	IsPersist  bool
	Conditions []FeatureFlagCondition
	Variants   map[string]interface{}
}

type Flags []FeatureFlag

func (flags Flags) HasPersist() bool {
	for _, flag := range flags {
		if flag.IsPersist {
			return true
		}
	}
	return false
}

func (conn *Conn) GetFeatureFlags(projectID uint32) (Flags, error) {
	rows, err := conn.c.Query(`SELECT feature_flag_id, flag_key, flag_type, is_persist FROM feature_flags WHERE project_id=$1 and is_active=true`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var flags []FeatureFlag

	for rows.Next() {
		var (
			flagID    uint32
			flagKey   string
			flagType  string
			isPersist bool
		)
		if err := rows.Scan(&flagID, &flagKey, &flagType, &isPersist); err != nil {
			return nil, err
		}
		flags = append(flags, FeatureFlag{
			FlagID:    flagID,
			FlagKey:   flagKey,
			FlagType:  flagType,
			IsPersist: isPersist,
		})
	}
	return flags, nil
}
