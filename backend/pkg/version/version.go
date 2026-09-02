package version

import (
	"os"
	"runtime/debug"
)

var build = resolve()

func resolve() string {
	sha := os.Getenv("GIT_SHA") // injected as an image ENV at build time
	dirty := ""
	if sha == "" {
		if bi, ok := debug.ReadBuildInfo(); ok {
			for _, s := range bi.Settings {
				switch s.Key {
				case "vcs.revision":
					sha = s.Value
				case "vcs.modified":
					if s.Value == "true" {
						dirty = "-dirty"
					}
				}
			}
		}
	}
	if sha == "" {
		sha = "unknown"
	}
	if len(sha) > 12 {
		sha = sha[:12]
	}
	out := "commit=" + sha + dirty
	if env := os.Getenv("DEPLOY_ENV"); env != "" {
		out += " env=" + env
	}
	return out
}

func String() string { return build }
