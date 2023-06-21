package postgres

import (
	"openreplay/backend/pkg/featureflags"
)

func (conn *Conn) GetFeatureFlags(projectID uint32) ([]*featureflags.FeatureFlag, error) {
	rows, err := conn.c.Query(`
		SELECT ff.flag_id, ff.flag_key, ff.flag_type, ff.is_persist, ff.payload, ff.rollout_percentages, ff.filters,
       		ARRAY_AGG(fv.value) as values,
       		ARRAY_AGG(fv.payload) as payloads,
       		ARRAY_AGG(fv.rollout_percentage) AS variants_percentages
		FROM (
			SELECT ff.feature_flag_id AS flag_id, ff.flag_key AS flag_key, ff.flag_type, ff.is_persist, ff.payload,
				ARRAY_AGG(fc.rollout_percentage) AS rollout_percentages,
				ARRAY_AGG(fc.filters) AS filters
			FROM public.feature_flags ff
				  LEFT JOIN public.feature_flags_conditions fc ON ff.feature_flag_id = fc.feature_flag_id
			WHERE ff.project_id = $1 AND ff.is_active = TRUE
			GROUP BY ff.feature_flag_id
		) AS ff
		LEFT JOIN public.feature_flags_variants fv ON ff.flag_type = 'multi' AND ff.flag_id = fv.feature_flag_id
		GROUP BY ff.flag_id, ff.flag_key, ff.flag_type, ff.is_persist, ff.payload, ff.filters, ff.rollout_percentages;
	`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var flags []*featureflags.FeatureFlag

	for rows.Next() {
		var flag featureflags.FeatureFlagPG
		if err := rows.Scan(&flag.FlagID, &flag.FlagKey, &flag.FlagType, &flag.IsPersist, &flag.Payload, &flag.RolloutPercentages,
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
