package accounts

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"

	"github.com/jackc/pgx/v5"

	config "openreplay/backend/internal/config/api"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
)

var ErrUnauthorized = errors.New("unauthorized")

type Service interface {
	Get(ctx context.Context, tenantID, userID uint64) (*Account, error)
	Update(ctx context.Context, tenantID, userID uint64, isAdmin bool, req *AccountRequest) (*AccountInfo, error)
	UpdateScope(ctx context.Context, tenantID uint64, scope int) error
	RegenerateAPIKey(ctx context.Context, tenantID uint64) (*APIKey, error)
	GetWeeklyReport(ctx context.Context, tenantID, userID uint64) (*WeeklyReport, error)
	UpdateWeeklyReport(ctx context.Context, tenantID, userID uint64, enabled bool) (*WeeklyReport, error)
	UpdateModule(ctx context.Context, tenantID, userID uint64, module string, status bool) (*UserSettings, error)
}

type serviceImpl struct {
	log    logger.Logger
	cfg    *config.Config
	pgconn pool.Pool
}

func New(log logger.Logger, cfg *config.Config, pgconn pool.Pool) Service {
	return &serviceImpl{
		log:    log,
		cfg:    cfg,
		pgconn: pgconn,
	}
}

func accountArgs(tenantID, userID uint64) pgx.NamedArgs {
	return pgx.NamedArgs{"tenantId": tenantID, "userId": userID}
}

func parseSettings(raw []byte) map[string]any {
	settings := map[string]any{}
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &settings); err != nil {
			settings = map[string]any{}
		}
	}
	return normalizeSettings(settings)
}

func (s *serviceImpl) getTenant(tenantID uint64) (*tenantInfo, error) {
	t := &tenantInfo{Edition: edition}
	var apiKey, tenantKey *string
	err := s.pgconn.QueryRow(`
		SELECT tenants.tenant_id, tenants.name, tenants.api_key, `+tenantKeyColumn+`,
		       (EXTRACT(EPOCH FROM tenants.created_at) * 1000)::BIGINT,
		       openreplay_version(), tenants.opt_out, tenants.scope_state
		FROM public.tenants
		WHERE `+tenantScope+`
		LIMIT 1`,
		pgx.NamedArgs{"tenantId": tenantID}).Scan(&t.TenantID, &t.TenantName, &apiKey, &tenantKey, &t.CreatedAt,
		&t.VersionNumber, &t.OptOut, &t.ScopeState)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTenantNotFound
		}
		return nil, fmt.Errorf("get tenant: %s", err)
	}
	t.APIKey, t.TenantKey = apiKey, tenantKey
	return t, nil
}

func (s *serviceImpl) Get(ctx context.Context, tenantID, userID uint64) (*Account, error) {
	u, extra, err := s.getUser(tenantID, userID)
	if err != nil {
		return nil, err
	}
	t, err := s.getTenant(tenantID)
	if err != nil {
		return nil, err
	}
	if !u.Admin && !u.SuperAdmin {
		t.APIKey, t.TenantKey = nil, nil
	}
	hasActivePlan, expirationDate := licenseStatus()
	return &Account{
		userInfo:       *u,
		userExtra:      *extra,
		tenantInfo:     *t,
		HasActivePlan:  hasActivePlan,
		ExpirationDate: expirationDate,
		SMTP:           s.cfg.SMTP.Configured(),
		accountExtra:   accountExtras(),
	}, nil
}

func (s *serviceImpl) Update(ctx context.Context, tenantID, userID uint64, isAdmin bool, req *AccountRequest) (*AccountInfo, error) {
	tx, err := s.pgconn.Begin()
	if err != nil {
		return nil, fmt.Errorf("begin tx: %s", err)
	}
	committed := false
	defer func() {
		if !committed {
			if rbErr := tx.TxRollback(); rbErr != nil {
				s.log.Warn(ctx, "failed to rollback account update: %s", rbErr)
			}
		}
	}()

	args := accountArgs(tenantID, userID)
	current := &AccountInfo{}
	if err := tx.TxQueryRow(`
		SELECT tenants.name, tenants.opt_out
		FROM public.tenants
		WHERE `+tenantScope+`
		LIMIT 1
		FOR UPDATE`, args).Scan(&current.TenantName, &current.OptOut); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTenantNotFound
		}
		return nil, fmt.Errorf("get tenant: %s", err)
	}

	if err := tx.TxQueryRow(`
		SELECT users.name
		FROM public.users
		WHERE users.user_id = @userId
		  AND users.deleted_at IS NULL
		  AND `+userScope+`
		FOR UPDATE`, args).Scan(&current.Name); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("get user: %s", err)
	}

	renameTenant := req.TenantName != nil && *req.TenantName != "" && *req.TenantName != current.TenantName
	changeOptOut := req.OptOut != nil && *req.OptOut != current.OptOut
	renameUser := req.Name != nil && *req.Name != "" && *req.Name != current.Name
	if (renameTenant || changeOptOut) && !isAdmin {
		return nil, ErrUnauthorized
	}
	if renameUser {
		if err := validateAccountName("name", *req.Name); err != nil {
			return nil, ValidationError{err}
		}
	}
	if renameTenant {
		if err := validateAccountName("tenantName", *req.TenantName); err != nil {
			return nil, ValidationError{err}
		}
	}

	if renameUser {
		args["name"] = *req.Name
		if err := tx.TxExec(`
			UPDATE public.users
			SET name = @name
			WHERE users.user_id = @userId
			  AND users.deleted_at IS NULL
			  AND `+userScope, args); err != nil {
			return nil, fmt.Errorf("update user name: %s", err)
		}
	}
	if renameTenant || changeOptOut {
		args["tenantName"] = current.TenantName
		args["optOut"] = current.OptOut
		if renameTenant {
			args["tenantName"] = *req.TenantName
		}
		if changeOptOut {
			args["optOut"] = *req.OptOut
		}
		if err := tx.TxExec(`
			UPDATE public.tenants
			SET name = @tenantName, opt_out = @optOut
			WHERE `+tenantScope, args); err != nil {
			return nil, fmt.Errorf("update tenant: %s", err)
		}
	}

	info := &AccountInfo{}
	if err := tx.TxQueryRow(`
		SELECT users.name, tenants.name, tenants.opt_out
		FROM public.users, public.tenants
		WHERE users.user_id = @userId
		  AND users.deleted_at IS NULL
		  AND `+userScope+`
		  AND `+tenantScope+`
		LIMIT 1`, args).Scan(&info.Name, &info.TenantName, &info.OptOut); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("get account info: %s", err)
	}
	if err := tx.TxCommit(); err != nil {
		return nil, fmt.Errorf("commit account update: %s", err)
	}
	committed = true
	return info, nil
}

func (s *serviceImpl) UpdateScope(ctx context.Context, tenantID uint64, scope int) error {
	args := pgx.NamedArgs{"tenantId": tenantID, "scope": scope}
	if err := s.pgconn.Exec(`
		UPDATE public.tenants
		SET scope_state = @scope
		WHERE `+tenantScope, args); err != nil {
		return fmt.Errorf("update scope: %s", err)
	}
	return nil
}

func generateAPIKey() (string, error) {
	key := make([]byte, apiKeyLength)
	limit := big.NewInt(int64(len(apiKeyAlphabet)))
	for i := range key {
		n, err := rand.Int(rand.Reader, limit)
		if err != nil {
			return "", err
		}
		key[i] = apiKeyAlphabet[n.Int64()]
	}
	return string(key), nil
}

func (s *serviceImpl) RegenerateAPIKey(ctx context.Context, tenantID uint64) (*APIKey, error) {
	key, err := generateAPIKey()
	if err != nil {
		return nil, fmt.Errorf("generate api key: %s", err)
	}
	res := &APIKey{}
	err = s.pgconn.QueryRow(`
		UPDATE public.tenants
		SET api_key = @apiKey
		WHERE `+tenantScope+`
		RETURNING tenants.api_key`,
		pgx.NamedArgs{"tenantId": tenantID, "apiKey": key}).Scan(&res.APIKey)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrTenantNotFound
		}
		return nil, fmt.Errorf("update api key: %s", err)
	}
	return res, nil
}

func (s *serviceImpl) GetWeeklyReport(ctx context.Context, tenantID, userID uint64) (*WeeklyReport, error) {
	res := &WeeklyReport{}
	err := s.pgconn.QueryRow(`
		SELECT users.weekly_report
		FROM public.users
		WHERE users.user_id = @userId
		  AND users.deleted_at IS NULL
		  AND `+userScope,
		accountArgs(tenantID, userID)).Scan(&res.WeeklyReport)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("get weekly report: %s", err)
	}
	return res, nil
}

func (s *serviceImpl) UpdateWeeklyReport(ctx context.Context, tenantID, userID uint64, enabled bool) (*WeeklyReport, error) {
	args := accountArgs(tenantID, userID)
	args["weeklyReport"] = enabled
	res := &WeeklyReport{}
	err := s.pgconn.QueryRow(`
		UPDATE public.users
		SET weekly_report = @weeklyReport
		WHERE users.user_id = @userId
		  AND users.deleted_at IS NULL
		  AND `+userScope+`
		RETURNING users.weekly_report`, args).Scan(&res.WeeklyReport)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("update weekly report: %s", err)
	}
	return res, nil
}

func (s *serviceImpl) UpdateModule(ctx context.Context, tenantID, userID uint64, module string, status bool) (*UserSettings, error) {
	tx, err := s.pgconn.Begin()
	if err != nil {
		return nil, fmt.Errorf("begin tx: %s", err)
	}
	committed := false
	defer func() {
		if !committed {
			if rbErr := tx.TxRollback(); rbErr != nil {
				s.log.Warn(ctx, "failed to rollback module update: %s", rbErr)
			}
		}
	}()

	args := accountArgs(tenantID, userID)
	var raw []byte
	if err := tx.TxQueryRow(`
		SELECT users.settings
		FROM public.users
		WHERE users.user_id = @userId
		  AND users.deleted_at IS NULL
		  AND `+userScope+`
		FOR UPDATE`, args).Scan(&raw); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("get user settings: %s", err)
	}
	settings := applyModule(parseSettings(raw), module, status)
	encoded, err := json.Marshal(settings)
	if err != nil {
		return nil, fmt.Errorf("marshal settings: %s", err)
	}
	args["settings"] = string(encoded)
	if err := tx.TxExec(`
		UPDATE public.users
		SET settings = @settings::jsonb
		WHERE users.user_id = @userId`, args); err != nil {
		return nil, fmt.Errorf("update user settings: %s", err)
	}
	if err := tx.TxCommit(); err != nil {
		return nil, fmt.Errorf("commit module update: %s", err)
	}
	committed = true
	return &UserSettings{Settings: settings}, nil
}
