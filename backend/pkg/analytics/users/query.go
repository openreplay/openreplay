package users

import (
	"fmt"
	"strings"

	"openreplay/backend/pkg/analytics/filters"
	"openreplay/backend/pkg/analytics/users/model"
)

func formatColumnForSelect(alias, col string, dbCol string) string {
	switch filters.UserColumn(col) {
	case filters.UserColumnCreatedAt:
		return fmt.Sprintf("toInt64(toUnixTimestamp(%s%s) * 1000) AS %s", alias, dbCol, col)
	case filters.UserColumnFirstEventAt:
		return fmt.Sprintf("toInt64(toUnixTimestamp(%s%s) * 1000) AS %s", alias, dbCol, col)
	case filters.UserColumnLastSeen:
		return fmt.Sprintf("toInt64(toUnixTimestamp(%s%s) * 1000) AS %s", alias, dbCol, col)
	case filters.UserColumnProperties:
		return fmt.Sprintf("toString(%s%s) AS %s", alias, dbCol, col)
	default:
		if strings.HasPrefix(col, "$") {
			return fmt.Sprintf("%s%s AS \"%s\"", alias, dbCol, col)
		}
		return fmt.Sprintf("%s%s AS %s", alias, dbCol, col)
	}
}

func BuildSelectColumns(tableAlias string, requestedColumns []string) []string {
	alias := filters.NormalizeAlias(tableAlias)

	baseColumns := []string{
		alias + "project_id",
		fmt.Sprintf("%s\"%s\" AS \"%s\"", alias, string(filters.UserColumnUserID), string(filters.UserColumnUserID)),
		fmt.Sprintf("%s\"%s\" AS \"%s\"", alias, string(filters.UserColumnEmail), string(filters.UserColumnEmail)),
		fmt.Sprintf("%s\"%s\" AS \"%s\"", alias, string(filters.UserColumnName), string(filters.UserColumnName)),
		fmt.Sprintf("%s\"%s\" AS \"%s\"", alias, string(filters.UserColumnFirstName), string(filters.UserColumnFirstName)),
		fmt.Sprintf("%s\"%s\" AS \"%s\"", alias, string(filters.UserColumnLastName), string(filters.UserColumnLastName)),
		fmt.Sprintf("toInt64(toUnixTimestamp(%s\"%s\") * 1000) AS %s", alias, string(filters.UserColumnCreatedAt), string(filters.UserColumnCreatedAt)),
		fmt.Sprintf("toInt64(toUnixTimestamp(%s\"%s\") * 1000) AS %s", alias, string(filters.UserColumnLastSeen), string(filters.UserColumnLastSeen)),
	}

	skipColumns := map[string]bool{
		string(filters.UserColumnUserID):    true,
		string(filters.UserColumnEmail):     true,
		string(filters.UserColumnName):      true,
		string(filters.UserColumnFirstName): true,
		string(filters.UserColumnLastName):  true,
		string(filters.UserColumnCreatedAt): true,
		string(filters.UserColumnLastSeen):  true,
		"project_id":                        true,
	}

	return filters.GenericBuildSelectColumns(tableAlias, baseColumns, requestedColumns, model.ColumnMapping, skipColumns, formatColumnForSelect)
}
