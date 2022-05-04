package uaparser

import (
	"log"
	"strings"

	"github.com/ua-parser/uap-go/uaparser"
)

type UAParser struct {
	p *uaparser.Parser
}

func NewUAParser(regexFile string) *UAParser {
	p, err := uaparser.New(regexFile)
	if err != nil {
		log.Fatalln(err)
	}
	return &UAParser{p}
}

type UA struct {
	OS             string
	OSVersion      string
	Browser        string
	BrowserVersion string
	Device         string
	DeviceType     string
}

func (parser *UAParser) Parse(str string) *UA {
	if str == "" {
		return nil
	}
	data := parser.p.Parse(str)
	if data == nil {
		return nil
	}
	ua := &UA{
		OS:      data.Os.Family,
		Browser: strings.Split(data.UserAgent.Family, "/")[0],
		Device:  data.Device.Family,
	}
	if ua.OS == "" || ua.Browser == "" || ua.Device == "Spider" {
		return nil
	}
	if ua.Device == "Other" || ua.Device == "Mac" {
		ua.Device = ""
	}
	if data.Os.Major != "" {
		ua.OSVersion += data.Os.Major
		if data.Os.Minor != "" {
			ua.OSVersion += "." + data.Os.Minor
			if data.Os.Patch != "" {
				ua.OSVersion += "." + data.Os.Patch
			}
		}
	}
	if data.UserAgent.Major != "" {
		ua.BrowserVersion += data.UserAgent.Major
		if data.UserAgent.Minor != "" {
			ua.BrowserVersion += "." + data.UserAgent.Minor
			if data.UserAgent.Patch != "" {
				ua.BrowserVersion += "." + data.UserAgent.Patch
			}
		}
	}
	switch ua.OS {
	case "Chrome OS", "Fedora", "FreeBSD", "Linux", "Mac OS X", "NetBSD", "Ubuntu", "Windows":
		ua.DeviceType = "desktop"
	case "Android", "BlackBerry OS", "BlackBerry Tablet OS", "iOS", "Windows Phone":
		ua.DeviceType = "mobile"
	default:
		ua.DeviceType = "other"
	}
	return ua
}
