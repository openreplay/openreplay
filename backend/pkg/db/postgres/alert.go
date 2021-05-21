package postgres

import (
	"database/sql"
	"errors"
	"fmt"
	sq "github.com/Masterminds/squirrel"
	"log"
	"strconv"
	"time"
)

type TimeString sql.NullString
type query struct {
	Left     string  `db:"query.left" json:"left"`
	Operator string  `db:"query.operator" json:"operator"`
	Right    float64 `db:"query.right" json:"right"`
}
type options struct {
	RenotifyInterval int64               `db:"options.renotifyInterval" json:"renotifyInterval"`
	LastNotification int64               `db:"options.lastNotification" json:"lastNotification;omitempty"`
	CurrentPeriod    int64               `db:"options.currentPeriod" json:"currentPeriod"`
	PreviousPeriod   int64               `db:"options.previousPeriod" json:"previousPeriod;omitempty"`
	Message          []map[string]string `db:"options.message" json:"message;omitempty"`
	Change           string              `db:"options.change" json:"change;omitempty"`
}
type Alert struct {
	AlertID         uint32         `db:"alert_id" json:"alert_id"`
	ProjectID       uint32         `db:"project_id" json:"project_id"`
	Name            string         `db:"name" json:"name"`
	Description     sql.NullString `db:"description" json:"description"`
	Active          bool           `db:"active" json:"active"`
	DetectionMethod string         `db:"detection_method" json:"detection_method"`
	Query           query          `db:"query" json:"query"`
	DeletedAt       *int64         `db:"deleted_at" json:"deleted_at"`
	CreatedAt       *int64         `db:"created_at" json:"created_at"`
	Options         options        `db:"options" json:"options"`
	TenantId        uint32         `db:"tenant_id" json:"tenant_id"`
}

func (pg *Conn) IterateAlerts(iter func(alert *Alert, err error)) error {
	rows, err := pg.query(`
		SELECT
			alerts.alert_id,
			alerts.project_id,
			alerts.name,
			alerts.description,
			alerts.active,
			alerts.detection_method,
			alerts.query,
			CAST(EXTRACT(epoch FROM alerts.deleted_at) * 1000 AS BIGINT) AS deleted_at,
			CAST(EXTRACT(epoch FROM alerts.created_at) * 1000 AS BIGINT) AS created_at,
			alerts.options,
			0 AS tenant_id
		FROM public.alerts
		WHERE alerts.active AND alerts.deleted_at ISNULL;
	`)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		a := new(Alert)
		if err = rows.Scan(
			&a.AlertID,
			&a.ProjectID,
			&a.Name,
			&a.Description,
			&a.Active,
			&a.DetectionMethod,
			&a.Query,
			&a.DeletedAt,
			&a.CreatedAt,
			&a.Options,
			&a.TenantId,
		); err != nil {
			iter(nil, err)
			continue
		}
		iter(a, nil)
	}

	if err = rows.Err(); err != nil {
		return err
	}
	return nil
}

func (pg *Conn) SaveLastNotification(allIds []uint32) error {
	var paramrefs string
	for _, v := range allIds {
		paramrefs += strconv.Itoa(int(v)) + `,`
	}
	paramrefs = paramrefs[:len(paramrefs)-1] // remove last ","
	q := "UPDATE public.Alerts SET options = options||'{\"lastNotification\":" + strconv.Itoa(int(time.Now().Unix()*1000)) + "}'::jsonb WHERE alert_id IN (" + paramrefs + ");"
	//log.Println(q)
	log.Println("Updating PG")
	return pg.exec(q)
}

type columnDefinition struct {
	table     string
	formula   string
	condition string
	group     string
}

var LeftToDb = map[string]columnDefinition{
	"performance.dom_content_loaded.average":     {table: "events.pages", formula: "COALESCE(AVG(NULLIF(dom_content_loaded_time ,0)),0)"},
	"performance.first_meaningful_paint.average": {table: "events.pages", formula: "COALESCE(AVG(NULLIF(first_contentful_paint_time,0)),0)"},
	"performance.page_load_time.average":         {table: "events.pages", formula: "AVG(NULLIF(load_time ,0))"},
	"performance.dom_build_time.average":         {table: "events.pages", formula: "AVG(NULLIF(dom_building_time,0))"},
	"performance.speed_index.average":            {table: "events.pages", formula: "AVG(NULLIF(speed_index,0))"},
	"performance.page_response_time.average":     {table: "events.pages", formula: "AVG(NULLIF(response_time,0))"},
	"performance.ttfb.average":                   {table: "events.pages", formula: "AVG(NULLIF(first_paint_time,0))"},
	"performance.time_to_render.averag":          {table: "events.pages", formula: "AVG(NULLIF(visually_complete,0))"},
	"performance.image_load_time.average":        {table: "events.resources", formula: "AVG(NULLIF(duration,0))", condition: "type=='img'"},
	"performance.request_load_time.average":      {table: "events.resources", formula: "AVG(NULLIF(duration,0))", condition: "type=='fetch'"},
	"resources.load_time.average":                {table: "events.resources", formula: "AVG(NULLIF(duration,0))"},
	"resources.missing.count":                    {table: "events.resources", formula: "COUNT(DISTINCT url_hostpath)", condition: "success==0"},
	"errors.4xx_5xx.count":                       {table: "events.resources", formula: "COUNT(session_id)", condition: "status/100!=2"},
	"errors.4xx.count":                           {table: "events.resources", formula: "COUNT(session_id)", condition: "status/100==4"},
	"errors.5xx.count":                           {table: "events.resources", formula: "COUNT(session_id)", condition: "status/100==5"},
	"errors.javascript.impacted_sessions.count":  {table: "events.resources", formula: "COUNT(DISTINCT session_id)", condition: "success= FALSE AND type='script'"},
	"performance.crashes.count":                  {table: "public.sessions", formula: "COUNT(DISTINCT session_id)", condition: "errors_count > 0"},
	"errors.javascript.count":                    {table: "events.errors INNER JOIN public.errors AS m_errors USING (error_id)", formula: "COUNT(DISTINCT session_id)", condition: "source=='js_exception'"},
	"errors.backend.count":                       {table: "events.errors INNER JOIN public.errors AS m_errors USING (error_id)", formula: "COUNT(DISTINCT session_id)", condition: "source!='js_exception'"},
}

//This is the frequency of execution for each threshold
var TimeInterval = map[int64]int64{
	15:   3,
	30:   5,
	60:   10,
	120:  20,
	240:  30,
	1440: 60,
}

func (a *Alert) CanCheck() bool {
	now := time.Now().Unix() * 1000
	var repetitionBase int64

	if repetitionBase = a.Options.CurrentPeriod; a.DetectionMethod == "change" && a.Options.CurrentPeriod > a.Options.PreviousPeriod {
		repetitionBase = a.Options.PreviousPeriod
	}

	if _, ok := TimeInterval[repetitionBase]; !ok {
		log.Printf("repetitionBase: %d NOT FOUND", repetitionBase)
		return false
	}
	return a.DeletedAt == nil && a.Active &&
		(a.Options.RenotifyInterval <= 0 ||
			a.Options.LastNotification <= 0 ||
			((now - a.Options.LastNotification) > a.Options.RenotifyInterval*60*1000)) &&
		((now-*a.CreatedAt)%(TimeInterval[repetitionBase]*60*1000)) < 60*1000
}

func (a *Alert) Build() (sq.SelectBuilder, error) {
	colDef := LeftToDb[a.Query.Left]
	subQ := sq.
		Select(colDef.formula + " AS value").
		From(colDef.table).
		Where(sq.And{sq.Eq{"project_id": a.ProjectID},
			sq.Expr(colDef.condition)})
	q := sq.Select(fmt.Sprint("value, coalesce(value,0)", a.Query.Operator, a.Query.Right, " AS valid"))
	if len(colDef.group) > 0 {
		subQ = subQ.Column(colDef.group + " AS group_value")
		subQ = subQ.GroupBy(colDef.group)
		q = q.Column("group_value")
	}

	if a.DetectionMethod == "threshold" {
		q = q.FromSelect(subQ.Where(sq.Expr("timesamp>=?", time.Now().Unix()-a.Options.CurrentPeriod*60)), "stat")
	} else if a.DetectionMethod == "change" {
		if a.Options.Change == "change" {
			if len(colDef.group) == 0 {
				sub1, args1, _ := subQ.Where(sq.Expr("timesamp>=?", time.Now().Unix()-a.Options.CurrentPeriod*60)).ToSql()
				sub2, args2, _ := subQ.Where(
					sq.And{
						sq.Expr("timesamp<?", time.Now().Unix()-a.Options.CurrentPeriod*60),
						sq.Expr("timesamp>=?", time.Now().Unix()-2*a.Options.CurrentPeriod*60),
					}).ToSql()
				sub1, _, _ = sq.Expr("SELECT ((" + sub1 + ")-(" + sub2 + ")) AS value").ToSql()
				q = q.JoinClause("FROM ("+sub1+") AS stat", append(args1, args2...)...)
			} else {
				subq1 := subQ.Where(sq.Expr("timesamp>=?", time.Now().Unix()-a.Options.CurrentPeriod*60))
				sub2, args2, _ := subQ.Where(
					sq.And{
						sq.Expr("timesamp<?", time.Now().Unix()-a.Options.CurrentPeriod*60),
						sq.Expr("timesamp>=?", time.Now().Unix()-2*a.Options.CurrentPeriod*60),
					}).ToSql()
				sub1 := sq.Select("group_value", "(stat1.value-stat2.value) AS value").FromSelect(subq1, "stat1").JoinClause("INNER JOIN ("+sub2+") AS stat2 USING(group_value)", args2...)
				q = q.FromSelect(sub1, "stat")
			}
		} else if a.Options.Change == "percent" {
			if len(colDef.group) == 0 {
				sub1, args1, _ := subQ.Where(sq.Expr("timesamp>=?", time.Now().Unix()-a.Options.CurrentPeriod*60)).ToSql()
				sub2, args2, _ := subQ.Where(
					sq.And{
						sq.Expr("timesamp<?", time.Now().Unix()-a.Options.CurrentPeriod*60),
						sq.Expr("timesamp>=?", time.Now().Unix()-a.Options.PreviousPeriod*60-a.Options.CurrentPeriod*60),
					}).ToSql()
				sub1, _, _ = sq.Expr("SELECT ((" + sub1 + ")/(" + sub2 + ")-1)*100 AS value").ToSql()
				q = q.JoinClause("FROM ("+sub1+") AS stat", append(args1, args2...)...)
			} else {
				subq1 := subQ.Where(sq.Expr("timesamp>=?", time.Now().Unix()-a.Options.CurrentPeriod*60))
				sub2, args2, _ := subQ.Where(
					sq.And{
						sq.Expr("timesamp<?", time.Now().Unix()-a.Options.CurrentPeriod*60),
						sq.Expr("timesamp>=?", time.Now().Unix()-a.Options.PreviousPeriod*60-a.Options.CurrentPeriod*60),
					}).ToSql()
				sub1 := sq.Select("group_value", "(stat1.value/stat2.value-1)*100 AS value").FromSelect(subq1, "stat1").JoinClause("INNER JOIN ("+sub2+") AS stat2 USING(group_value)", args2...)
				q = q.FromSelect(sub1, "stat")
			}
		} else {
			return q, errors.New("unsupported change method")
		}

	} else {
		return q, errors.New("unsupported detection method")
	}
	return q, nil
}
