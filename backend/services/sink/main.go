package main

import (
	"log"
	"encoding/binary"
	"time"

	"os"
	"os/signal"
	"syscall"

	"openreplay/backend/pkg/env"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
)

 

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC | log.Llongfile)

	writer := NewWriter(env.Uint16("FS_ULIMIT"), env.String("FS_DIR"))
  
  count := 0

	consumer := queue.NewMessageConsumer(
		env.String("GROUP_SINK"),
		[]string{ 
			env.String("TOPIC_RAW"),
	  },
	  func(sessionID uint64, message messages.Message, _ *types.Meta) {
	  	//typeID, err := messages.GetMessageTypeID(value)
	  	// if err != nil {
	  	// 	log.Printf("Message type decoding error: %v", err)
	  	// 	return
	  	// }
	  	typeID := message.Meta().TypeID
	  	if typeID == 70 {
	  		log.Println("iframe here")
	  	}
	  	if !messages.IsReplayerType(typeID) {
	  		return
	  	}

	  	count++

	  	value := message.Encode()
	  	var data []byte
	  	if messages.IsIOSType(typeID) {
	  		data = value
	  	} else {
				data = make([]byte, len(value)+8)
				copy(data[8:], value[:])
				binary.LittleEndian.PutUint64(data[0:], message.Meta().Index)
	  	}
	  	if err := writer.Write(sessionID, data); err != nil {
				log.Printf("Writer error: %v\n", err)
			}
	  },
	)
	consumer.DisableAutoCommit()


	sigchan := make(chan os.Signal, 1)
  signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

  tick := time.Tick(30 * time.Second)

  log.Printf("Sink service started\n")
	for {
		select {
		case sig := <-sigchan:
			log.Printf("Caught signal %v: terminating\n", sig)
			consumer.Commit()
			consumer.Close()
			os.Exit(0)
		case <-tick:
			if err := writer.SyncAll(); err != nil {
				log.Fatalf("Sync error: %v\n", err)
			}

			log.Printf("%v messages during 30 sec", count)
			count = 0
			
			consumer.Commit()
		default:
			err := consumer.ConsumeNext()
			if err != nil {
				log.Fatalf("Error on consumption: %v", err)
			}
		}
	}

}

