package clickhouse

import (
	"database/sql"
	_ "github.com/ClickHouse/clickhouse-go"
	"log"

	"openreplay/backend/pkg/license"
)

type Connector struct {
	sessionsIOS *bulk
	//viewsIOS       *bulk
	clicksIOS      *bulk
	inputsIOS      *bulk
	crashesIOS     *bulk
	performanceIOS *bulk
	resourcesIOS   *bulk
	sessions       *bulk
	metadata       *bulk // TODO: join sessions, sessions_metadata & sessions_ios
	resources      *bulk
	pages          *bulk
	clicks         *bulk
	inputs         *bulk
	errors         *bulk
	performance    *bulk
	longtasks      *bulk
	db             *sql.DB
}

func NewConnector(url string) *Connector {
	license.CheckLicense()

	db, err := sql.Open("clickhouse", url)
	if err != nil {
		log.Fatalln(err)
	}
	return &Connector{
		db: db,
		// sessionsIOS: newBulk(db, `
		//    INSERT INTO sessions_ios (session_id, project_id, tracker_version, rev_id, user_uuid, user_os, user_os_version, user_device, user_device_type, user_country, datetime, duration, views_count, events_count, crashes_count, metadata_1, metadata_2, metadata_3, metadata_4, metadata_5, metadata_6, metadata_7, metadata_8, metadata_9, metadata_10)
		//    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		//  `),
		// viewsIOS: newBulk(db, `
		// 	INSERT INTO views_ios (session_id, project_id, tracker_version, rev_id, user_uuid, user_os, user_os_version,  user_device, user_device_type, user_country, datetime, url, request_start, response_start, response_end, dom_content_loaded_event_start, dom_content_loaded_event_end, load_event_start, load_event_end, first_paint, first_contentful_paint, speed_index, visually_complete, time_to_interactive)
		// 	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		// `),
		// clicksIOS: newBulk(db, `
		// 	INSERT INTO clicks_ios (session_id, project_id, tracker_version, rev_id, user_uuid, user_os, user_os_version, user_device, user_device_type, user_country, datetime, label)
		// 	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		// `),
		// inputsIOS: newBulk(db, `
		// 	INSERT INTO inputs_ios (session_id, project_id, tracker_version, rev_id, user_uuid, user_os, user_os_version, user_device, user_device_type, user_country, datetime, label)
		// 	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		// `),
		// crashesIOS: newBulk(db, `
		// 	INSERT INTO crashes_ios (session_id, project_id, tracker_version, rev_id, user_uuid, user_os, user_os_version, user_device, user_device_type, user_country, datetime, name, reason, crash_id)
		// 	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		// `),
		// performanceIOS: newBulk(db, `
		// 	INSERT INTO performance_ios (session_id, project_id, tracker_version, rev_id, user_uuid, user_os, user_os_version, user_device, user_device_type, user_country, datetime, min_fps, avg_fps, max_fps, min_cpu, avg_cpu, max_cpu, min_memory, avg_memory, max_memory)
		// 	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		// `),
		// resourcesIOS: newBulk(db, `
		// 	INSERT INTO resources_ios (session_id, project_id, tracker_version, rev_id, user_uuid, user_os, user_os_version, user_device, user_device_type, user_country, datetime, url, duration, body_size, success, method, status)
		// 	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, nullIf(?, ''), ?)
		// `),

		sessions: newBulk(db, `
	    INSERT INTO sessions (session_id, project_id, tracker_version, rev_id, user_uuid, user_os, user_os_version, user_device, user_device_type, user_country, datetime, duration, pages_count, events_count, errors_count,   user_browser, user_browser_version)
	    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	  `),
		// TODO: join sessions, sessions_metadata & sessions_ios
		metadata: newBulk(db, `
	    INSERT INTO sessions_metadata (session_id, user_id, user_anonymous_id, metadata_1, metadata_2, metadata_3, metadata_4, metadata_5, metadata_6, metadata_7, metadata_8, metadata_9, metadata_10, datetime)
	    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	  `),
		resources: newBulk(db, `
	    INSERT INTO resources (session_id, project_id, tracker_version, rev_id, user_uuid, user_os, user_os_version, user_browser, user_browser_version, user_device, user_device_type, user_country, datetime, url, type, duration, ttfb, header_size, encoded_body_size, decoded_body_size, success)
	    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	  `),
		pages: newBulk(db, `
			INSERT INTO pages (session_id, project_id, tracker_version, rev_id, user_uuid, user_os, user_os_version, user_browser, user_browser_version, user_device, user_device_type, user_country, datetime, url, request_start, response_start, response_end, dom_content_loaded_event_start, dom_content_loaded_event_end, load_event_start, load_event_end, first_paint, first_contentful_paint, speed_index, visually_complete, time_to_interactive)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`),
		clicks: newBulk(db, `
			INSERT INTO clicks (session_id, project_id, tracker_version, rev_id, user_uuid, user_os, user_os_version, user_browser, user_browser_version, user_device, user_device_type, user_country, datetime, label, hesitation_time)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`),
		inputs: newBulk(db, `
			INSERT INTO inputs (session_id, project_id, tracker_version, rev_id, user_uuid, user_os, user_os_version, user_browser, user_browser_version, user_device, user_device_type, user_country, datetime, label)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`),
		errors: newBulk(db, `
			INSERT INTO errors (session_id, project_id, tracker_version, rev_id, user_uuid, user_os, user_os_version, user_browser, user_browser_version, user_device, user_device_type, user_country, datetime, source, name, message, error_id)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`),
		performance: newBulk(db, `
			INSERT INTO performance (session_id, project_id, tracker_version, rev_id, user_uuid, user_os, user_os_version, user_browser, user_browser_version, user_device, user_device_type, user_country, datetime, min_fps, avg_fps, max_fps, min_cpu, avg_cpu, max_cpu, min_total_js_heap_size, avg_total_js_heap_size, max_total_js_heap_size, min_used_js_heap_size, avg_used_js_heap_size, max_used_js_heap_size)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`),
		longtasks: newBulk(db, `
			INSERT INTO longtasks (session_id, project_id, tracker_version, rev_id, user_uuid, user_os, user_os_version, user_browser, user_browser_version, user_device, user_device_type, user_country, datetime, context, container_type, container_id, container_name, container_src)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`),
	}
}

func (conn *Connector) Prepare() error {
	// if err := conn.sessionsIOS.prepare(); err != nil {
	// 	return err
	// }
	// // if err := conn.viewsIOS.prepare(); err != nil {
	// // 	return err
	// // }
	// if err := conn.clicksIOS.prepare(); err != nil {
	// 	return err
	// }
	// if err := conn.inputsIOS.prepare(); err != nil {
	// 	return err
	// }
	// if err := conn.crashesIOS.prepare(); err != nil {
	// 	return err
	// }
	// if err := conn.performanceIOS.prepare(); err != nil {
	// 	return err
	// }
	// if err := conn.resourcesIOS.prepare(); err != nil {
	// 	return err
	// }
	if err := conn.sessions.prepare(); err != nil {
		return err
	}
	if err := conn.metadata.prepare(); err != nil {
		return err
	}
	if err := conn.resources.prepare(); err != nil {
		return err
	}
	if err := conn.pages.prepare(); err != nil {
		return err
	}
	if err := conn.clicks.prepare(); err != nil {
		return err
	}
	if err := conn.inputs.prepare(); err != nil {
		return err
	}
	if err := conn.errors.prepare(); err != nil {
		return err
	}
	if err := conn.performance.prepare(); err != nil {
		return err
	}
	if err := conn.longtasks.prepare(); err != nil {
		return err
	}
	return nil
}

func (conn *Connector) Commit() error {
	// if err := conn.sessionsIOS.commit(); err != nil {
	// 	return err
	// }
	// // if err := conn.viewsIOS.commit(); err != nil {
	// // 	return err
	// // }
	// if err := conn.clicksIOS.commit(); err != nil {
	// 	return err
	// }
	// if err := conn.inputsIOS.commit(); err != nil {
	// 	return err
	// }
	// if err := conn.crashesIOS.commit(); err != nil {
	// 	return err
	// }
	// if err := conn.performanceIOS.commit(); err != nil {
	// 	return err
	// }
	// if err := conn.resourcesIOS.commit(); err != nil {
	// 	return err
	// }
	if err := conn.sessions.commit(); err != nil {
		return err
	}
	if err := conn.metadata.commit(); err != nil {
		return err
	}
	if err := conn.resources.commit(); err != nil {
		return err
	}
	if err := conn.pages.commit(); err != nil {
		return err
	}
	if err := conn.clicks.commit(); err != nil {
		return err
	}
	if err := conn.inputs.commit(); err != nil {
		return err
	}
	if err := conn.errors.commit(); err != nil {
		return err
	}
	if err := conn.performance.commit(); err != nil {
		return err
	}
	if err := conn.longtasks.commit(); err != nil {
		return err
	}
	return nil
}

func (conn *Connector) FinaliseSessionsTable() error {
	_, err := conn.db.Exec("OPTIMIZE TABLE sessions FINAL")
	return err
}
