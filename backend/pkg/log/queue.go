package log

import (
  "time"
  "fmt"
  "log"

  "openreplay/backend/pkg/messages"
  "openreplay/backend/pkg/queue/types"
  //"openreplay/backend/pkg/env"
)


type partitionStats struct {
  maxts int64
  mints int64
  lastts int64
  lastID uint64
  count int
}

type queueStats struct {
  prts map[int32]*partitionStats
  tick <-chan time.Time
}

func NewQueueStats(sec int)*queueStats {
  return &queueStats{
    prts: make(map[int32]*partitionStats),
    tick: time.Tick(time.Duration(sec) * time.Second),
  }
}

func (qs *queueStats) HandleAndLog(sessionID uint64, m *types.Meta) {
  prti := int32(sessionID % 16) // TODO use GetKeyPartition from kafka/key.go
  prt, ok := qs.prts[prti]
  if !ok {
    qs.prts[prti] = &partitionStats{}
    prt = qs.prts[prti]
  }

  if prt.maxts < m.Timestamp {
    prt.maxts = m.Timestamp
  }
  if prt.mints > m.Timestamp || prt.mints == 0 {
    prt.mints = m.Timestamp
  }
  prt.lastts = m.Timestamp
  prt.lastID = m.ID
  prt.count += 1


  select {
  case <-qs.tick:
    qs.LogThenReset()
  default:
  }
}


func (qs *queueStats) LogThenReset() {
  s := "Queue Statistics: "
  for i, p := range qs.prts {
    s = fmt.Sprintf("%v | %v:: lastTS %v, lastID %v, count %v, maxTS %v, minTS %v", 
      s, i, p.lastts, p.lastID, p.count, p.maxts, p.mints)
  }
  log.Println(s)
  // reset
  qs.prts = make(map[int32]*partitionStats) 
}


// TODO: list of message id to log (mb filter function with callback in messages/utils.go or something)
func LogMessage(s string, sessionID uint64, msg messages.Message, m *types.Meta) {
  log.Printf("%v | SessionID: %v, Queue info: %v, Message: %v", s, sessionID, m, msg)
}

