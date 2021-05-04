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

const CHParallelLimit = 2

var chCount int64

type manager struct {
	notificationsUrl   string
	alertsCache        map[uint32]*postgres.Alert
	cacheMutex         sync.Mutex
	chParallel         chan bool
	ch                 *sql.DB
	pg                 *postgres.Conn
	pgMutex            sync.Mutex
	notifications      map[uint32]*postgres.TenantNotification
	notificationsGo    *sync.WaitGroup
	notificationsMutex sync.Mutex
}

func NewManager(notificationsUrl string, ch *sql.DB, pg *postgres.Conn) *manager {
	return &manager{
		notificationsUrl:   notificationsUrl,
		alertsCache:        make(map[uint32]*postgres.Alert),
		cacheMutex:         sync.Mutex{},
		chParallel:         make(chan bool, CHParallelLimit),
		ch:                 ch,
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
		<-m.chParallel
	}()
	if !a.CanCheck() {
		//log.Printf("cannot check %+v", a)
		//log.Printf("cannot check alertId %d", a.AlertID)
		log.Printf("cannot check %s", a.Name)
		return
	}
	//log.Printf("checking %+v", a)
	log.Printf("quering %s", a.Name)
	//--- For stats:
	atomic.AddInt64(&chCount, 1)
	q, err := a.Build()
	if err != nil {
		log.Println(err)
		return
	}

	//sub1, args, _ := q.ToSql()
	//log.Println(sub1)
	//log.Println(args)
	//return
	rows, err := q.RunWith(m.ch).Query()

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
		//log.Println(valid)
		//log.Println(value.Valid)
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
				Options:     map[string]interface{}{"source": "ALERT", "sourceId": a.AlertID, "sourceMeta": a.DetectionMethod, "message": a.Options.Message, "projectId": a.ProjectID},
			}
			m.notificationsMutex.Unlock()
		}
	}

}
func (m *manager) RequestAll() {
	now := time.Now().Unix()
	m.cacheMutex.Lock()
	for _, a := range m.alertsCache {
		m.chParallel <- true
		m.notificationsGo.Add(1)
		go m.processAlert(a)
		//m.processAlert(a)
	}
	//log.Println("releasing cache")
	m.cacheMutex.Unlock()
	//log.Println("waiting for all alerts to finish")
	m.notificationsGo.Wait()
	log.Printf("done %d CH queries in: %ds", chCount, time.Now().Unix()-now)
	chCount = 0
	//log.Printf("Processing %d Notifications", len(m.notifications))
	m.notificationsMutex.Lock()
	go m.ProcessNotifications(m.notifications)
	m.notificationsMutex.Unlock()
	m.notifications = make(map[uint32]*postgres.TenantNotification)
	//log.Printf("Notifications purged: %d", len(m.notifications))
}

func (m *manager) ProcessNotifications(allNotifications map[uint32]*postgres.TenantNotification) {
	//return
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
		return
	}
}
