package senders

import "embed"

// templates holds the shared e-mail assets (HTML templates and the inline logo), the Go
// counterpart of api/chalicelib/utils/html/. Render them with Email.Render.
//
//go:embed templates/*
var templates embed.FS
