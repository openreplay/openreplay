package senders

import "openreplay/backend/internal/config/common"

func defaultSMTP() common.SMTP {
	return common.SMTP{Host: "smtp.example.com", Port: 587, UseTLS: true, From: "OpenReplay<do-not-reply@openreplay.com>"}
}
