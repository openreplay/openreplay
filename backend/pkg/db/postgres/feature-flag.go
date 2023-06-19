package postgres

import (
	"openreplay/backend/pkg/featureflags"
)

func (conn *Conn) GetFeatureFlags(projectID uint32) ([]*featureflags.FeatureFlag, error) {
	rows, err := conn.c.Query(`
		SELECT ff.feature_flag_id AS flag_id, ff.flag_key, ff.flag_type, ff.is_persist,
			ARRAY_AGG(fc.rollout_percentage) AS rollout_percentages,
			ARRAY_AGG(fc.filters) AS filters,
			ARRAY_AGG(fv.value) AS values,
			ARRAY_AGG(fv.payload) AS payloads,
			ARRAY_AGG(fv.rollout_percentage) AS variant_rollout_percentages
		FROM public.feature_flags ff
		JOIN public.feature_flags_conditions fc ON ff.feature_flag_id = fc.feature_flag_id
		LEFT JOIN public.feature_flags_variants fv ON ff.flag_type = 'multi' AND ff.feature_flag_id = fv.feature_flag_id
		WHERE ff.project_id = $1 AND ff.is_active = TRUE
		GROUP BY ff.feature_flag_id;
	`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var flags []*featureflags.FeatureFlag

	for rows.Next() {
		var flag featureflags.FeatureFlagPG
		if err := rows.Scan(&flag.FlagID, &flag.FlagKey, &flag.FlagType, &flag.IsPersist, &flag.RolloutPercentages,
			&flag.Filters, &flag.Values, &flag.Payloads, &flag.VariantRollout); err != nil {
			return nil, err
		}
		parsedFlag, err := featureflags.ParseFeatureFlag(&flag)
		if err != nil {
			return nil, err
		}
		flags = append(flags, parsedFlag)
	}
	return flags, nil
}
