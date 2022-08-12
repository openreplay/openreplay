package postgres

type UnstartedSession struct {
	ProjectKey         string
	TrackerVersion     string
	DoNotTrack         bool
	Platform           string
	UserAgent          string
	UserOS             string
	UserOSVersion      string
	UserBrowser        string
	UserBrowserVersion string
	UserDevice         string
	UserDeviceType     string
	UserCountry        string
}

func (conn *Conn) InsertUnstartedSession(s UnstartedSession) error {
	return conn.c.Exec(`
		INSERT INTO unstarted_sessions (
			project_id, 
			tracker_version, do_not_track, 
			platform, user_agent, 
			user_os, user_os_version, 
			user_browser, user_browser_version,
			user_device, user_device_type, 
			user_country
		) VALUES (
			(SELECT project_id FROM projects WHERE project_key = $1), 
			$2, $3,
			$4, $5, 
			$6, $7, 
			$8, $9,
			$10, $11,
			$12
		)`,
		s.ProjectKey,
		s.TrackerVersion, s.DoNotTrack,
		s.Platform, s.UserAgent,
		s.UserOS, s.UserOSVersion,
		s.UserBrowser, s.UserBrowserVersion,
		s.UserDevice, s.UserDeviceType,
		s.UserCountry,
	)
}
