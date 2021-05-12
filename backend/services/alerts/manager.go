package main

import (
	"database/sql"
	"fmt"
	"log"
	"sync"
	"sync/atomic"
	"time"

	"openreplay/backend/pkg/db/postgres"
)

const PGParallelLimit = 2

var pgCount int64

type manager struct {
	postgresString     string
	notificationsUrl   string
	alertsCache        map[uint32]*postgres.Alert
	cacheMutex         sync.Mutex
	pgParallel         chan bool
	pgs                *sql.DB
	pg                 *postgres.Conn
	pgMutex            sync.Mutex
	notifications      map[uint32]*postgres.TenantNotification
	notificationsGo    *sync.WaitGroup
	notificationsMutex sync.Mutex
}

func NewManager(notificationsUrl string, postgresString string, pgs *sql.DB, pg *postgres.Conn) *manager {
	return &manager{
		postgresString:     postgresString,
		notificationsUrl:   notificationsUrl,
		alertsCache:        make(map[uint32]*postgres.Alert),
		cacheMutex:         sync.Mutex{},
		pgParallel:         make(chan bool, PGParallelLimit),
		pgs:                pgs,
		pg:                 pg,
		pgMutex:            sync.Mutex{},
		notifications:      make(map[uint32]*postgres.TenantNotification),
		notificationsGo:    &sync.WaitGroup{},
		notificationsMutex: sync.Mutex{},
	}

}

func (m *manager) Length() int {
	return len(m.alertsCache)
}

func (m *manager) Update(a *postgres.Alert) error {
	m.cacheMutex.Lock()
	defer m.cacheMutex.Unlock()
	_, exists := m.alertsCache[a.AlertID]
	if exists && a.DeletedAt != nil {
		log.Println("deleting alert from memory")
		delete(m.alertsCache, a.AlertID)
		return nil
	} else {
		m.alertsCache[a.AlertID] = a
	}
	return nil
}
func (m *manager) processAlert(a *postgres.Alert) {
	defer func() {
		defer m.notificationsGo.Done()
		<-m.pgParallel
	}()
	if !a.CanCheck() {
		log.Printf("cannot check %s", a.Name)
		return
	}
	//log.Printf("checking %+v", a)
	log.Printf("quering %s", a.Name)
	//--- For stats:
	atomic.AddInt64(&pgCount, 1)
	q, err := a.Build()
	if err != nil {
		log.Println(err)
		return
	}

	rows, err := q.RunWith(m.pgs).Query()

	if err != nil {
		log.Println(err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var (
			value sql.NullFloat64
			valid bool
		)
		if err := rows.Scan(&value, &valid); err != nil {
			log.Println(err)
			continue
		}

		if valid && value.Valid {
			log.Printf("%s: valid", a.Name)
			m.notificationsMutex.Lock()
			m.notifications[a.AlertID] = &postgres.TenantNotification{
				TenantId:    a.TenantId,
				Title:       a.Name,
				Description: fmt.Sprintf("has been triggered, %s = %.0f (%s %.0f).", a.Query.Left, value.Float64, a.Query.Operator, a.Query.Right),
				ButtonText:  "Check metrics for more details",
				ButtonUrl:   fmt.Sprintf("/%d/metrics", a.ProjectID),
				ImageUrl:    nil,
				Options:     map[string]interface{}{"source": "ALERT", "sourceId": a.AlertID, "sourceMeta": a.DetectionMethod, "message": a.Options.Message, "projectId": a.ProjectID, "data": map[string]interface{}{"title": a.Name, "limitValue": a.Query.Right, "actualValue": value.Float64, "operator": a.Query.Operator, "trigger": a.Query.Left, "alertId": a.AlertID, "detectionMethod": a.DetectionMethod, "currentPeriod": a.Options.CurrentPeriod, "previousPeriod": a.Options.PreviousPeriod, "createdAt": time.Now().Unix() * 1000}},
			}
			m.notificationsMutex.Unlock()
		}
	}

}
func (m *manager) RequestAll() {
	now := time.Now().Unix()
	m.cacheMutex.Lock()
	for _, a := range m.alertsCache {
		m.pgParallel <- true
		m.notificationsGo.Add(1)
		go m.processAlert(a)
		//m.processAlert(a)
	}
	//log.Println("releasing cache")
	m.cacheMutex.Unlock()
	//log.Println("waiting for all alerts to finish")
	m.notificationsGo.Wait()
	log.Printf("done %d PG queries in: %ds", pgCount, time.Now().Unix()-now)
	pgCount = 0
	//log.Printf("Processing %d Notifications", len(m.notifications))
	m.notificationsMutex.Lock()
	go m.ProcessNotifications(m.notifications)
	m.notificationsMutex.Unlock()
	m.notifications = make(map[uint32]*postgres.TenantNotification)
	//log.Printf("Notifications purged: %d", len(m.notifications))
}

func (m *manager) ProcessNotifications(allNotifications map[uint32]*postgres.TenantNotification) {
	if len(allNotifications) == 0 {
		log.Println("No notifications to process")
		return
	}
	log.Printf("sending %d notifications", len(allNotifications))
	allIds := make([]uint32, 0, len(allNotifications))
	toSend := postgres.Notifications{
		Notifications: []*postgres.TenantNotification{},
	}
	for k, n := range allNotifications {
		//log.Printf("notification for %d", k)
		allIds = append(allIds, k)
		toSend.Notifications = append(toSend.Notifications, n)
	}
	toSend.Send(m.notificationsUrl)
	if err := m.pg.SaveLastNotification(allIds); err != nil {
		log.Printf("Error saving LastNotification time: %v", err)
		if err.Error() == "conn closed" {
			m.pg = postgres.NewConn(m.postgresString)
			//if err != nil {
			//	panic(fmt.Sprintf("Postgres renew notifications connection error: %v\n", err))
			//}
			if err := m.pg.SaveLastNotification(allIds); err != nil {
				panic(fmt.Sprintf("Error saving LastNotification time, suicide: %v", err))
			}
		}
	}
}
