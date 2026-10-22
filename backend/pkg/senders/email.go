package senders

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/base64"
	"errors"
	"fmt"
	"html/template"
	"io"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
	"net"
	"net/mail"
	"net/smtp"
	"net/textproto"
	"strconv"
	"strings"
	"time"

	"openreplay/backend/internal/config/common"
)

const logoCID = "img-0"

// Email is a generic SMTP sender: callers supply the subject and the HTML body (usually via
// Render) and every message carries the OpenReplay logo inline as cid:img-0.
type Email struct {
	cfg  common.SMTP
	tmpl *template.Template
	logo []byte
	from *mail.Address
}

func NewEmail(cfg common.SMTP) (*Email, error) {
	tmpl, err := template.ParseFS(templates, "templates/*.html")
	if err != nil {
		return nil, fmt.Errorf("parse email templates: %w", err)
	}
	logo, err := templates.ReadFile("templates/logo.png")
	if err != nil {
		return nil, fmt.Errorf("read logo: %w", err)
	}
	from, err := mail.ParseAddress(cfg.From)
	if err != nil {
		return nil, fmt.Errorf("invalid EMAIL_FROM %q: %w", cfg.From, err)
	}
	return &Email{cfg: cfg, tmpl: tmpl, logo: logo, from: from}, nil
}

// Configured reports whether an SMTP host is set.
func (e *Email) Configured() bool { return e.cfg.Configured() }

// From returns the parsed sender address.
func (e *Email) From() *mail.Address { return e.from }

// Render executes one of the embedded HTML templates (by file name, e.g. "alert_notification.html").
// Templates reference the inline logo as cid:img-0.
func (e *Email) Render(name string, data any) (string, error) {
	var buf bytes.Buffer
	if err := e.tmpl.ExecuteTemplate(&buf, name, data); err != nil {
		return "", fmt.Errorf("render %s: %w", name, err)
	}
	return buf.String(), nil
}

// buildMessage assembles a multipart/related MIME message with the HTML body and the
// embedded logo referenced as cid:img-0.
func buildMessage(from *mail.Address, to, subject, html string, logo []byte) ([]byte, error) {
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	fmt.Fprintf(&buf, "From: %s\r\n", from.String())
	fmt.Fprintf(&buf, "To: %s\r\n", to)
	fmt.Fprintf(&buf, "Subject: %s\r\n", mime.QEncoding.Encode("utf-8", subject))
	fmt.Fprintf(&buf, "Date: %s\r\n", time.Now().Format(time.RFC1123Z))
	buf.WriteString("MIME-Version: 1.0\r\n")
	fmt.Fprintf(&buf, "Content-Type: multipart/related; boundary=%q\r\n\r\n", mw.Boundary())

	htmlHdr := textproto.MIMEHeader{}
	htmlHdr.Set("Content-Type", "text/html; charset=utf-8")
	htmlHdr.Set("Content-Transfer-Encoding", "quoted-printable")
	part, err := mw.CreatePart(htmlHdr)
	if err != nil {
		return nil, err
	}
	qp := quotedprintable.NewWriter(part)
	if _, err := io.WriteString(qp, html); err != nil {
		return nil, err
	}
	if err := qp.Close(); err != nil {
		return nil, err
	}

	imgHdr := textproto.MIMEHeader{}
	imgHdr.Set("Content-Type", "image/png")
	imgHdr.Set("Content-Transfer-Encoding", "base64")
	imgHdr.Set("Content-ID", "<"+logoCID+">")
	imgHdr.Set("Content-Disposition", "inline; filename=\"logo.png\"")
	part, err = mw.CreatePart(imgHdr)
	if err != nil {
		return nil, err
	}
	enc := base64.StdEncoding.EncodeToString(logo)
	for len(enc) > 0 {
		n := 76
		if n > len(enc) {
			n = len(enc)
		}
		if _, err := io.WriteString(part, enc[:n]+"\r\n"); err != nil {
			return nil, err
		}
		enc = enc[n:]
	}
	if err := mw.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// Send e-mails one HTML message to one recipient. It errors when SMTP is not configured.
func (e *Email) Send(ctx context.Context, recipient, subject, html string) error {
	if !e.Configured() {
		return errors.New("smtp not configured")
	}
	if _, err := mail.ParseAddress(recipient); err != nil {
		return fmt.Errorf("invalid recipient %q: %w", recipient, err)
	}
	msg, err := buildMessage(e.from, recipient, subject, html, e.logo)
	if err != nil {
		return fmt.Errorf("build email: %w", err)
	}
	client, err := e.connect(ctx)
	if err != nil {
		return err
	}
	defer client.Close()
	if err := client.Mail(e.from.Address); err != nil {
		return fmt.Errorf("MAIL FROM: %w", err)
	}
	if err := client.Rcpt(recipient); err != nil {
		return fmt.Errorf("RCPT TO: %w", err)
	}
	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("DATA: %w", err)
	}
	if _, err := w.Write(msg); err != nil {
		return err
	}
	if err := w.Close(); err != nil {
		return err
	}
	return client.Quit()
}

// connect mirrors the Python SMTPClient: implicit TLS when EMAIL_USE_SSL (optionally with a
// client certificate), otherwise plain connect followed by STARTTLS when EMAIL_USE_TLS, then
// PLAIN auth with a LOGIN fallback when credentials are set.
func (e *Email) connect(ctx context.Context) (*smtp.Client, error) {
	addr := net.JoinHostPort(e.cfg.Host, strconv.Itoa(e.cfg.Port))
	dialer := &net.Dialer{Timeout: 10 * time.Second}
	var client *smtp.Client
	if e.cfg.UseSSL {
		tlsCfg := &tls.Config{ServerName: e.cfg.Host}
		if e.cfg.SSLCert != "" && e.cfg.SSLKey != "" {
			cert, err := tls.LoadX509KeyPair(e.cfg.SSLCert, e.cfg.SSLKey)
			if err != nil {
				return nil, fmt.Errorf("load smtp client certificate: %w", err)
			}
			tlsCfg.Certificates = []tls.Certificate{cert}
		}
		conn, err := tls.DialWithDialer(dialer, "tcp", addr, tlsCfg)
		if err != nil {
			return nil, fmt.Errorf("smtp tls dial %s: %w", addr, err)
		}
		client, err = smtp.NewClient(conn, e.cfg.Host)
		if err != nil {
			conn.Close()
			return nil, fmt.Errorf("smtp handshake: %w", err)
		}
	} else {
		conn, err := dialer.DialContext(ctx, "tcp", addr)
		if err != nil {
			return nil, fmt.Errorf("smtp dial %s: %w", addr, err)
		}
		client, err = smtp.NewClient(conn, e.cfg.Host)
		if err != nil {
			conn.Close()
			return nil, fmt.Errorf("smtp handshake: %w", err)
		}
		if e.cfg.UseTLS {
			if ok, _ := client.Extension("STARTTLS"); ok {
				if err := client.StartTLS(&tls.Config{ServerName: e.cfg.Host}); err != nil {
					client.Close()
					return nil, fmt.Errorf("smtp starttls: %w", err)
				}
			}
		}
	}
	if e.cfg.User != "" && e.cfg.Password != "" {
		if err := authenticate(client, e.cfg.Host, e.cfg.User, e.cfg.Password); err != nil {
			client.Close()
			return nil, fmt.Errorf("smtp auth: %w", err)
		}
	}
	return client, nil
}

func authenticate(client *smtp.Client, host, user, password string) error {
	ok, mechs := client.Extension("AUTH")
	if !ok {
		return nil
	}
	if strings.Contains(mechs, "PLAIN") {
		if err := client.Auth(smtp.PlainAuth("", user, password, host)); err == nil {
			return nil
		} else if !strings.Contains(mechs, "LOGIN") {
			return err
		}
	}
	return client.Auth(&loginAuth{user: user, password: password})
}

// loginAuth implements the legacy AUTH LOGIN mechanism (smtplib supports it; net/smtp does not).
type loginAuth struct {
	user, password string
}

func (a *loginAuth) Start(*smtp.ServerInfo) (string, []byte, error) {
	return "LOGIN", nil, nil
}

func (a *loginAuth) Next(fromServer []byte, more bool) ([]byte, error) {
	if !more {
		return nil, nil
	}
	switch strings.ToLower(strings.TrimSpace(string(fromServer))) {
	case "username:":
		return []byte(a.user), nil
	case "password:":
		return []byte(a.password), nil
	}
	return nil, fmt.Errorf("unexpected server challenge %q", fromServer)
}
