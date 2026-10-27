package team

import (
	"context"
	"crypto/rand"
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	config "openreplay/backend/internal/config/api"
	"openreplay/backend/pkg/db/postgres/pool"
	"openreplay/backend/pkg/logger"
	"openreplay/backend/pkg/server/user"
)

const (
	invitationSubject = "Welcome to OpenReplay"
	emailTimeout      = time.Minute
	memberColumns     = `users.user_id, users.email, users.role::text, users.name,
		(EXTRACT(EPOCH FROM users.created_at) * 1000)::BIGINT,
		DATE_PART('day', timezone('utc'::text, now()) - COALESCE(basic_authentication.invited_at, '2000-01-01'::timestamp)) >= 1,
		` + memberJoined + `,
		basic_authentication.invitation_token, ` + memberRoleColumns
)

//go:embed templates/invitation.html
var invitationTemplate string

type Mailer interface {
	Configured() bool
	Send(ctx context.Context, recipient, subject, html string) error
}

type Team interface {
	List(ctx context.Context, tenantID uint64) ([]*Member, error)
	Invite(ctx context.Context, inviter *user.User, req *InviteRequest) (*Member, error)
	Update(ctx context.Context, editor *user.User, memberID int64, req *UpdateRequest) (*Member, error)
	Delete(ctx context.Context, editor *user.User, memberID int64) ([]*Member, error)
	ResetInvitation(ctx context.Context, tenantID uint64, memberID int64) (*InvitationLink, error)
	TransferOwnership(ctx context.Context, owner *user.User, memberID int64) (*Member, error)
}

type teamImpl struct {
	log    logger.Logger
	cfg    *config.Config
	pgconn pool.Pool
	mailer Mailer
}

func New(log logger.Logger, cfg *config.Config, pgconn pool.Pool, mailer Mailer) Team {
	if cfg.SiteURL == "" {
		log.Warn(context.Background(), "SITE_URL is not set, invitation links will be relative")
	}
	return &teamImpl{
		log:    log,
		cfg:    cfg,
		pgconn: pgconn,
		mailer: mailer,
	}
}

func memberQuery(where string) string {
	return `
		SELECT ` + memberColumns + `
		FROM public.users
		         LEFT JOIN public.basic_authentication ON basic_authentication.user_id = users.user_id
		         ` + memberRoleJoin + `
		WHERE users.deleted_at IS NULL
		  AND ` + memberScope + where
}

func memberArgs(tenantID uint64, memberID int64) pgx.NamedArgs {
	return pgx.NamedArgs{"tenantId": tenantID, "userId": memberID}
}

func (s *teamImpl) invitationLink(token string) string {
	return strings.TrimRight(s.cfg.SiteURL, "/") + strings.Replace(s.cfg.InvitationLink, "%s", token, 1)
}

func (s *teamImpl) scanMember(row pgx.Row) (*Member, error) {
	m := &Member{}
	var role string
	var token *string
	if err := row.Scan(&m.UserID, &m.Email, &role, &m.Name, &m.CreatedAt, &m.ExpiredInvitation, &m.Joined,
		&token, &m.RoleID, &m.RoleName); err != nil {
		return nil, err
	}
	m.setRole(role)
	if token != nil && !m.Joined {
		link := s.invitationLink(*token)
		m.InvitationLink = &link
	}
	return m, nil
}

func (s *teamImpl) List(ctx context.Context, tenantID uint64) ([]*Member, error) {
	rows, err := s.pgconn.Query(memberQuery(``)+`
		ORDER BY users.name, users.user_id`, pgx.NamedArgs{"tenantId": tenantID})
	if err != nil {
		return nil, fmt.Errorf("list members: %s", err)
	}
	defer rows.Close()

	members := make([]*Member, 0)
	for rows.Next() {
		m, err := s.scanMember(rows)
		if err != nil {
			return nil, fmt.Errorf("scan member: %s", err)
		}
		members = append(members, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate members: %s", err)
	}
	return members, nil
}

func (s *teamImpl) getMember(tenantID uint64, memberID int64) (*Member, error) {
	m, err := s.scanMember(s.pgconn.QueryRow(memberQuery(`
		  AND users.user_id = @userId`), memberArgs(tenantID, memberID)))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get member: %s", err)
	}
	return m, nil
}

func newInvitationToken() (string, error) {
	b := make([]byte, 64)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

type txFunc func(tx *pool.Tx) error

func (s *teamImpl) inTx(ctx context.Context, fn txFunc) error {
	tx, err := s.pgconn.Begin()
	if err != nil {
		return fmt.Errorf("begin tx: %s", err)
	}
	if err := fn(tx); err != nil {
		if rbErr := tx.TxRollback(); rbErr != nil {
			s.log.Warn(ctx, "failed to rollback team change: %s", rbErr)
		}
		return err
	}
	if err := tx.TxCommit(); err != nil {
		return fmt.Errorf("commit: %s", err)
	}
	return nil
}

func setInvitation(tx *pool.Tx, userID int64, token string) error {
	return tx.TxExec(`
		INSERT INTO public.basic_authentication (user_id, invitation_token, invited_at)
		VALUES (@userId, @token, timezone('utc'::text, now()))
		ON CONFLICT (user_id) DO UPDATE
		    SET invitation_token     = EXCLUDED.invitation_token,
		        invited_at           = EXCLUDED.invited_at,
		        password             = NULL,
		        changed_at           = NULL,
		        change_pwd_expire_at = NULL,
		        change_pwd_token     = NULL`,
		pgx.NamedArgs{"userId": userID, "token": token})
}

func (s *teamImpl) Invite(ctx context.Context, inviter *user.User, req *InviteRequest) (*Member, error) {
	if !rolesEnabled {
		req.RoleID.value = nil
	}
	token, err := newInvitationToken()
	if err != nil {
		return nil, fmt.Errorf("generate invitation token: %s", err)
	}
	data, err := json.Marshal(map[string]int64{"lastAnnouncementView": time.Now().UnixMilli()})
	if err != nil {
		return nil, err
	}

	var memberID int64
	var tenantName string
	err = s.inTx(ctx, func(tx *pool.Tx) error {
		var exists bool
		if err := tx.TxQueryRow(`
			SELECT EXISTS(SELECT 1 FROM public.users WHERE users.email = @email AND users.deleted_at IS NULL)`,
			pgx.NamedArgs{"email": req.Email}).Scan(&exists); err != nil {
			return fmt.Errorf("check email: %s", err)
		}
		if exists {
			return badRequest("user already exists")
		}
		roleID, err := s.resolveRole(tx, inviter.TenantID, req.RoleID.value)
		if err != nil {
			return err
		}
		memberID, err = s.createOrRestore(tx, &newMember{
			tenantID: inviter.TenantID,
			email:    req.Email,
			name:     req.Name,
			role:     req.role(),
			roleID:   roleID,
			data:     string(data),
		})
		if err != nil {
			return err
		}
		if err := setInvitation(tx, memberID, token); err != nil {
			return fmt.Errorf("set invitation: %s", err)
		}
		if err := tx.TxQueryRow(`
			SELECT tenants.name FROM public.tenants WHERE `+tenantScope+` LIMIT 1`,
			pgx.NamedArgs{"tenantId": inviter.TenantID}).Scan(&tenantName); err != nil {
			return fmt.Errorf("get tenant name: %s", err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	member, err := s.getMember(inviter.TenantID, memberID)
	if err != nil || member == nil {
		return nil, fmt.Errorf("get invited member: %v", err)
	}
	link := s.invitationLink(token)
	member.InvitationLink = &link
	go s.sendInvitation(req.Email, link, tenantName, inviter.Name)
	return member, nil
}

func (s *teamImpl) sendInvitation(recipient, link, tenantName, sender string) {
	ctx, cancel := context.WithTimeout(context.Background(), emailTimeout)
	defer cancel()
	if s.mailer == nil || !s.mailer.Configured() {
		s.log.Warn(ctx, "smtp is not configured, invitation email not sent")
		return
	}
	body := strings.NewReplacer(
		"%(sender)s", html.EscapeString(sender),
		"%(clientId)s", html.EscapeString(tenantName),
		"%(invitationLink)s", html.EscapeString(link),
	).Replace(invitationTemplate)
	if err := s.mailer.Send(ctx, recipient, invitationSubject, body); err != nil {
		s.log.Error(ctx, "failed to send invitation email: %s", err)
	}
}

func (s *teamImpl) Update(ctx context.Context, editor *user.User, memberID int64, req *UpdateRequest) (*Member, error) {
	roleID := req.RoleID.value
	if !rolesEnabled {
		roleID = nil
	}
	target, err := s.getMember(editor.TenantID, memberID)
	if err != nil {
		return nil, err
	}
	if target == nil {
		return nil, notFound("member not found")
	}
	if roleID != nil && target.RoleID != nil && *roleID == *target.RoleID {
		roleID = nil
	}

	editingSelf := int64(editor.ID) == target.UserID
	if !editingSelf {
		if editor.Role != "owner" && target.SuperAdmin {
			return nil, badRequest("only the owner can edit his own details")
		}
	} else if target.SuperAdmin {
		req.Admin = nil
		if roleID != nil {
			return nil, badRequest("owner's role cannot be changed")
		}
	} else {
		if req.Admin != nil && *req.Admin != target.Admin {
			return nil, badRequest("cannot change your own admin privileges")
		}
		if roleID != nil {
			return nil, badRequest("cannot change your own role")
		}
	}

	args := memberArgs(editor.TenantID, memberID)
	args["name"] = nil
	if req.Name != "" {
		args["name"] = req.Name
	}
	args["role"] = nil
	if req.Admin != nil && !target.SuperAdmin {
		args["role"] = "member"
		if *req.Admin {
			args["role"] = "admin"
		}
	}
	ownerGuard := ``
	if !editingSelf {
		ownerGuard = `
			  AND users.role != 'owner'`
	}
	err = s.inTx(ctx, func(tx *pool.Tx) error {
		args["roleId"] = nil
		if roleID != nil {
			resolved, err := s.resolveRole(tx, editor.TenantID, roleID)
			if err != nil {
				return err
			}
			args["roleId"] = resolved
		}
		var updated int64
		if err := tx.TxQueryRow(`
			UPDATE public.users
			SET name = COALESCE(@name, users.name),
			    role = COALESCE(@role::user_role, users.role)`+updateRoleSet+`
			WHERE users.user_id = @userId
			  AND users.deleted_at IS NULL
			  AND `+userScope+ownerGuard+`
			RETURNING users.user_id`, args).Scan(&updated); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return badRequest("only the owner can edit his own details")
			}
			return fmt.Errorf("update member: %s", err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.getMember(editor.TenantID, memberID)
}

func (s *teamImpl) Delete(ctx context.Context, editor *user.User, memberID int64) ([]*Member, error) {
	if int64(editor.ID) == memberID {
		return nil, badRequest("unauthorized, cannot delete self")
	}
	target, err := s.getMember(editor.TenantID, memberID)
	if err != nil {
		return nil, err
	}
	if target == nil {
		return nil, notFound("not found")
	}
	if target.SuperAdmin {
		return nil, badRequest("cannot delete super admin")
	}
	err = s.inTx(ctx, func(tx *pool.Tx) error {
		args := memberArgs(editor.TenantID, memberID)
		if err := tx.TxQueryRow(`
			UPDATE public.users
			SET deleted_at           = timezone('utc'::text, now()),
			    jwt_iat              = NULL,
			    jwt_refresh_jti      = NULL,
			    jwt_refresh_iat      = NULL,
			    spot_jwt_iat         = NULL,
			    spot_jwt_refresh_jti = NULL,
			    spot_jwt_refresh_iat = NULL`+deleteMemberSet+`
			WHERE users.user_id = @userId
			  AND users.deleted_at IS NULL
			  AND users.role != 'owner'
			  AND `+userScope+`
			RETURNING users.user_id`, args).Scan(new(int64)); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return badRequest("cannot delete super admin")
			}
			return fmt.Errorf("delete member: %s", err)
		}
		if err := tx.TxExec(`
			UPDATE public.basic_authentication
			SET password             = NULL,
			    invitation_token     = NULL,
			    invited_at           = NULL,
			    changed_at           = NULL,
			    change_pwd_expire_at = NULL,
			    change_pwd_token     = NULL
			WHERE basic_authentication.user_id = @userId`, args); err != nil {
			return fmt.Errorf("clear member credentials: %s", err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.List(ctx, editor.TenantID)
}

func (s *teamImpl) ResetInvitation(ctx context.Context, tenantID uint64, memberID int64) (*InvitationLink, error) {
	target, err := s.getMember(tenantID, memberID)
	if err != nil {
		return nil, err
	}
	if target == nil {
		return nil, notFound("user not found")
	}
	if target.SuperAdmin || target.Joined {
		return nil, badRequest("unauthorized")
	}
	token, err := newInvitationToken()
	if err != nil {
		return nil, fmt.Errorf("generate invitation token: %s", err)
	}
	var reset int64
	err = s.pgconn.QueryRow(`
		UPDATE public.basic_authentication
		SET invitation_token     = @token,
		    invited_at           = timezone('utc'::text, now()),
		    change_pwd_expire_at = NULL,
		    change_pwd_token     = NULL
		FROM public.users
		WHERE basic_authentication.user_id = users.user_id
		  AND users.user_id = @userId
		  AND users.deleted_at IS NULL
		  AND users.role != 'owner'
		  AND NOT `+memberJoined+`
		  AND `+userScope+`
		RETURNING basic_authentication.user_id`,
		pgx.NamedArgs{"tenantId": tenantID, "userId": memberID, "token": token}).Scan(&reset)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, badRequest("unauthorized")
		}
		return nil, fmt.Errorf("reset invitation: %s", err)
	}
	return &InvitationLink{InvitationLink: s.invitationLink(token)}, nil
}

func (s *teamImpl) TransferOwnership(ctx context.Context, owner *user.User, memberID int64) (*Member, error) {
	if int64(owner.ID) == memberID {
		return nil, badRequest("cannot transfer ownership to yourself")
	}
	target, err := s.getMember(owner.TenantID, memberID)
	if err != nil {
		return nil, err
	}
	if target == nil {
		return nil, notFound("target user not found")
	}
	if !target.Joined {
		return nil, badRequest("target user has not yet joined, they must accept their invitation first")
	}
	err = s.inTx(ctx, func(tx *pool.Tx) error {
		ownerRoleID, adminRoleID, err := s.ownershipRoles(tx, owner.TenantID)
		if err != nil {
			return err
		}
		args := pgx.NamedArgs{
			"tenantId":    owner.TenantID,
			"ownerId":     owner.ID,
			"userId":      memberID,
			"ownerRoleId": ownerRoleID,
			"adminRoleId": adminRoleID,
		}
		var updated int64
		if err := tx.TxQueryRow(`
			UPDATE public.users
			SET role = 'admin'`+demoteOwnerSet+`
			WHERE users.user_id = @ownerId
			  AND users.role = 'owner'
			  AND users.deleted_at IS NULL
			  AND `+userScope+`
			RETURNING users.user_id`, args).Scan(&updated); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return badRequest("ownership transfer failed, owner role may have already been transferred")
			}
			return fmt.Errorf("demote owner: %s", err)
		}
		if err := tx.TxQueryRow(`
			UPDATE public.users
			SET role = 'owner'`+promoteOwnerSet+`
			WHERE users.user_id = @userId
			  AND users.role != 'owner'
			  AND users.deleted_at IS NULL
			  AND `+userScope+`
			RETURNING users.user_id`, args).Scan(&updated); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return badRequest("ownership transfer failed, target user could not be promoted")
			}
			return fmt.Errorf("promote owner: %s", err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.getMember(owner.TenantID, memberID)
}
