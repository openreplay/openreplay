package filters

import (
	"fmt"
	"strings"
)

const (
	userSubqueryAlias = "u"
	userLiveDeletedAt = `'1970-01-01 00:00:00'`
)

var userDateTimeColumns = map[UserColumn]bool{
	UserColumnCreatedAt:    true,
	UserColumnFirstEventAt: true,
	UserColumnLastSeen:     true,
}

func UserFilterColumn(name string) string {
	if col, ok := GetUserColumnMapping(name); ok {
		return col
	}
	return string(UserColumnProperties)
}

func userColumnDefault(name string) string {
	if userDateTimeColumns[UserColumn(name)] {
		return "toDateTime(0)"
	}
	return "''"
}

func BuildLatestUsersSubquery(cols []string, projectParam string) string {
	selectCols := `"$user_id"`
	if len(cols) > 0 {
		selectCols += ", " + strings.Join(cols, ", ")
	}
	return fmt.Sprintf(`SELECT %s, _deleted_at FROM product_analytics.users WHERE project_id = %s ORDER BY _timestamp DESC LIMIT 1 BY "$user_id"`, selectCols, projectParam)
}

func BuildUserSemiJoinCondition(tableAlias string, filter Filter, projID uint32, mappings FilterMappings, qp *Params) string {
	cond := BuildFilterCondition(tableAlias, filter, userSubqueryAlias, mappings, qp)
	if cond == "" {
		return ""
	}

	col := UserFilterColumn(filter.Name)
	inner := BuildLatestUsersSubquery([]string{col}, qp.Add(projID))
	userIDCol := NormalizeAlias(tableAlias) + `"$user_id"`

	onDefault := fmt.Sprintf(`(SELECT ifNull((%s), 0) FROM (SELECT %s AS %s) AS %s)`, cond, userColumnDefault(filter.Name), col, userSubqueryAlias)
	notIn := fmt.Sprintf(`%s NOT IN (SELECT "$user_id" FROM (%s) AS %s WHERE %s._deleted_at = %s AND NOT ifNull((%s), 0))`, userIDCol, inner, userSubqueryAlias, userSubqueryAlias, userLiveDeletedAt, cond)
	in := fmt.Sprintf(`%s IN (SELECT "$user_id" FROM (%s) AS %s WHERE %s._deleted_at = %s AND (%s))`, userIDCol, inner, userSubqueryAlias, userSubqueryAlias, userLiveDeletedAt, cond)

	return fmt.Sprintf("if(%s, %s, %s)", onDefault, notIn, in)
}
