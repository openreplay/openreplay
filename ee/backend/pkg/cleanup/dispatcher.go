package cleanup

import (
	"context"
	"errors"
	"fmt"

	config "openreplay/backend/internal/config/ender"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
)

type dispatcherImpl struct {
	log      logger.Logger
	cfg      *config.Config
	consumer types.Consumer
	producer types.Producer
}

type Dispatcher interface {
	Close()
}

func NewDispatcher(log logger.Logger, cfg *config.Config, producer types.Producer) (Dispatcher, error) {
	switch {
	case log == nil:
		return nil, errors.New("nil logger")
	case cfg == nil:
		return nil, errors.New("nil config")
	case producer == nil:
		return nil, errors.New("nil producer")
	}
	d := &dispatcherImpl{
		log:      log,
		cfg:      cfg,
		producer: producer,
	}
	consumer, err := queue.NewConsumer(
		log,
		cfg.GroupCleanup,
		[]string{cfg.TopicTrigger},
		messages.NewMessageIterator(
			log,
			d.handle,
			[]int{messages.MsgSessionEnd, messages.MsgMobileSessionEnd},
			true,
		),
		true,
		cfg.MessageSizeLimit,
		nil,
		cfg.CleanupReadGap,
	)
	if err != nil {
		return nil, fmt.Errorf("can't init cleanup consumer: %s", err)
	}
	d.consumer = consumer
	go d.run()
	log.Info(context.Background(), "cleanup dispatcher started with readGap=%s", cfg.CleanupReadGap)
	return d, nil
}

func (d *dispatcherImpl) handle(msg messages.Message) {
	sessionID := msg.SessionID()
	sessCtx := context.WithValue(context.Background(), "sessionID", fmt.Sprintf("%d", sessionID))
	cleanMsg := &messages.CleanSession{}

	// Send to storage service (both web and mobile)
	if err := d.producer.Produce(d.cfg.TopicTrigger, sessionID, cleanMsg.Encode()); err != nil {
		d.log.Error(sessCtx, "can't send CleanSession to storage: %s", err)
	}

	if msg.TypeID() == messages.MsgMobileSessionEnd {
		// Send to images service (mobile only)
		if err := d.producer.Produce(d.cfg.TopicRawImages, sessionID, cleanMsg.Encode()); err != nil {
			d.log.Error(sessCtx, "can't send CleanSession to images: %s", err)
		}
	} else {
		// Send to canvases service (web only)
		if err := d.producer.Produce(d.cfg.TopicCanvasImages, sessionID, cleanMsg.Encode()); err != nil {
			d.log.Error(sessCtx, "can't send CleanSession to canvases: %s", err)
		}
	}
}

func (d *dispatcherImpl) run() {
	ctx := context.Background()
	for {
		if err := d.consumer.ConsumeNext(); err != nil {
			d.log.Fatal(ctx, "cleanup consumer error: %s", err)
		}
	}
}

func (d *dispatcherImpl) Close() {
	d.consumer.Close()
}
