package datasaver

import (
	"context"
	"openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/messages"
	sdk "openreplay/backend/pkg/sdk/model"
	"openreplay/backend/pkg/sessions"
)

func (s *saverImpl) handleWebMessage(session *sessions.Session, msg messages.Message) error {
	switch m := msg.(type) {
	case *messages.SessionStart:
		if err := s.users.Add(session, sdk.NewUser(m.UserID)); err != nil {
			s.log.Warn(context.Background(), "error adding user to session: %s", err)
		}
		return s.ch.InsertDefaultAutocompleteValues(session, m)
	case *messages.SessionEnd:
		return s.ch.InsertWebSession(session)
	case *messages.Metadata:
		return s.sessions.UpdateMetadata(m.SessionID(), m.Key, m.Value)
	case *messages.IssueEvent:
		if (m.Type == "dead_click" || m.Type == "click_rage") && s.tags.ShouldIgnoreTag(session.ProjectID, m.Context) {
			return nil
		}
		if err := s.ch.InsertIssue(session, m); err != nil {
			return err
		}
		return s.issues.Add(session.SessionID, m.Type)
	case *messages.CustomIssue:
		ie := &messages.IssueEvent{
			Type:          "custom",
			Timestamp:     m.Timestamp,
			MessageID:     m.Index,
			ContextString: m.Name,
			Payload:       m.Payload,
		}
		ie.SetMeta(m.Meta())
		if err := s.ch.InsertIssue(session, ie); err != nil {
			return err
		}
		return s.issues.Add(session.SessionID, ie.Type)
	case *messages.UserID:
		if err := s.users.Add(session, sdk.NewUser(m.ID)); err != nil {
			return err
		}
		return s.ch.InsertAutocomplete(session, "USERID", m.ID)
	case *messages.UserAnonymousID:
		if err := s.sessions.UpdateAnonymousID(session.SessionID, m.ID); err != nil {
			return err
		}
		return s.ch.InsertAutocomplete(session, "USERANONYMOUSID", m.ID)
	case *messages.CustomEvent:
		return s.ch.InsertCustom(session, m)
	case *messages.MouseClick:
		if err := s.ch.InsertWebClickEvent(session, m); err != nil {
			return err
		}
		return s.sessions.UpdateEventsStats(session.SessionID, 1, 0)
	case *messages.PageEvent:
		if err := s.ch.InsertWebPageEvent(session, m); err != nil {
			return err
		}
		s.sessions.UpdateReferrer(session.SessionID, m.Referrer)
		s.sessions.UpdateUTM(session.SessionID, m.URL)
		return s.sessions.UpdateEventsStats(session.SessionID, 1, 1)
	case *messages.NetworkRequest:
		return s.ch.InsertRequest(session, m, session.SaveRequestPayload)
	case *messages.GraphQL:
		return s.ch.InsertGraphQL(session, m)
	case *messages.JSException:
		if err := s.ch.InsertWebJSException(session, m); err != nil {
			return err
		}
		return s.issues.Add(session.SessionID, types.JsExceptionType)
	case *messages.InputChange:
		if err := s.ch.InsertWebInputDuration(session, m); err != nil {
			return err
		}
		return s.sessions.UpdateEventsStats(session.SessionID, 1, 0)
	case *messages.MouseThrashing:
		if err := s.ch.InsertMouseThrashing(session, m); err != nil {
			return err
		}
		return s.issues.Add(session.SessionID, "mouse_thrashing")
	case *messages.TagTrigger:
		return s.ch.InsertTagTrigger(session, m)
	case *messages.PerformanceTrackAggr:
		return s.ch.InsertWebPerformanceTrackAggr(session, m)
	case *messages.Incident:
		if err := s.ch.InsertIncident(session, m); err != nil {
			return err
		}
		return s.issues.Add(session.SessionID, types.IncidentType)
	case *messages.CanvasNode:
		return s.canvases.Add(session.SessionID, m.NodeId, m.Timestamp)
	}
	return nil
}
