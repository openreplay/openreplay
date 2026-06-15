package api

import (
	"context"
	"os"
	"strconv"

	"github.com/go-playground/validator/v10"

	videoConfig "openreplay/backend/internal/config/videoreplays"
	"openreplay/backend/pkg/analytics/model"
	"openreplay/backend/pkg/queue"
	"openreplay/backend/pkg/queue/types"
	"openreplay/backend/pkg/server/api"
	"openreplay/backend/pkg/server/user"
	"openreplay/backend/pkg/sessions"
	vapi "openreplay/backend/pkg/videoreplays/api"
	vsvc "openreplay/backend/pkg/videoreplays/service"
)

func eeServices(d eeDeps) ([]api.Handlers, []Worker, error) {
	if enabled, _ := strconv.ParseBool(os.Getenv("REPLAY_EXPORT_ENABLED")); !enabled {
		d.log.Info(context.Background(), "replay export disabled, skipping video-replays setup")
		return nil, nil, nil
	}

	vcfg := videoConfig.New(d.log)

	storage, err := vsvc.NewStorage(d.log, d.pgconn)
	if err != nil {
		return nil, nil, err
	}

	batchJobs, err := vsvc.NewSessionBatchService(d.log, vcfg)
	if err != nil {
		return nil, nil, err
	}

	sess := sessions.New(d.log, d.pgconn, d.projects, nil, d.dbMetrics)
	users := user.New(d.pgconn)

	svc, err := vsvc.New(d.log, vcfg, storage, batchJobs, d.objStore, users)
	if err != nil {
		return nil, nil, err
	}

	responser := api.NewResponser(d.webMetrics)
	reqValidator := validator.New()
	reqValidator.RegisterStructValidation(model.ValidateMetricFields, model.MetricPayload{})

	handlers, err := vapi.NewHandlers(d.log, vcfg, responser, sess, svc, reqValidator)
	if err != nil {
		return nil, nil, err
	}

	consumer, err := queue.NewConsumer(
		d.log,
		vcfg.GroupSessionVideoReplay,
		[]string{vcfg.TopicSessionVideoReplay},
		svc,
		false,
		vcfg.MessageSizeLimit,
		nil,
		types.NoReadBackGap,
	)
	if err != nil {
		return nil, nil, err
	}

	return []api.Handlers{handlers}, []Worker{newConsumerWorker(d.log, consumer)}, nil
}
