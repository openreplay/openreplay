package datasaver

import (
	"context"

	"openreplay/backend/pkg/db/postgres"
	"openreplay/backend/pkg/db/types"
	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/sessions"
)

func (s *saverImpl) handleWebMessage(sessCtx context.Context, session *sessions.Session, msg messages.Message) error {
	switch m := msg.(type) {
	case *messages.SessionStart:
		return s.pg.HandleStartEvent(m)
	case *messages.SessionEnd:
		if err := s.pg.HandleEndEvent(m.SessionID()); err != nil {
			return err
		}
		session, err := s.sessions.GetUpdated(m.SessionID(), true)
		if err != nil {
			return err
		}
		return s.ch.InsertWebSession(session)
	case *messages.Metadata:
		return s.sessions.UpdateMetadata(m.SessionID(), m.Key, m.Value)
	case *messages.IssueEvent:
		if m.Type == "dead_click" || m.Type == "click_rage" {
			if s.tags.ShouldIgnoreTag(session.ProjectID, m.Context) {
				return nil
			}
		}
		if err := s.pg.InsertIssueEvent(session, m); err != nil {
			return err
		}
		if err := s.sessions.UpdateIssuesStats(session.SessionID, 0, postgres.GetIssueScore(m.Type)); err != nil {
			return err
		}
		return s.ch.InsertIssue(session, m)
	case *messages.CustomIssue:
		ie := &messages.IssueEvent{
			Type:          "custom",
			Timestamp:     m.Timestamp,
			MessageID:     m.Index,
			ContextString: m.Name,
			Payload:       m.Payload,
		}
		ie.SetMeta(m.Meta())
		if err := s.pg.InsertIssueEvent(session, ie); err != nil {
			return err
		}
		return s.sessions.UpdateIssuesStats(session.SessionID, 0, postgres.GetIssueScore(ie.Type))
	case *messages.UserID:
		if err := s.sessions.UpdateUserID(session.SessionID, m.ID); err != nil {
			return err
		}
		s.pg.InsertAutocompleteValue(session.SessionID, session.ProjectID, "USERID", m.ID)
		return nil
	case *messages.UserAnonymousID:
		if err := s.sessions.UpdateAnonymousID(session.SessionID, m.ID); err != nil {
			return err
		}
		s.pg.InsertAutocompleteValue(session.SessionID, session.ProjectID, "USERANONYMOUSID", m.ID)
		return nil
	case *messages.CustomEvent:
		if err := s.pg.InsertWebCustomEvent(session, m); err != nil {
			return err
		}
		return s.ch.InsertCustom(session, m)
	case *messages.MouseClick:
		if err := s.pg.InsertWebClickEvent(session, m); err != nil {
			return err
		}
		if err := s.sessions.UpdateEventsStats(session.SessionID, 1, 0); err != nil {
			return err
		}
		return s.ch.InsertWebClickEvent(session, m)
	case *messages.PageEvent:
		if err := s.pg.InsertWebPageEvent(session, m); err != nil {
			return err
		}
		s.sessions.UpdateReferrer(session.SessionID, m.Referrer)
		s.sessions.UpdateUTM(session.SessionID, m.URL)
		if err := s.sessions.UpdateEventsStats(session.SessionID, 1, 1); err != nil {
			return err
		}
		return s.ch.InsertWebPageEvent(session, m)
	case *messages.NetworkRequest:
		if err := s.pg.InsertWebNetworkRequest(session, m); err != nil {
			return err
		}
		return s.ch.InsertRequest(session, m, session.SaveRequestPayload)
	case *messages.GraphQL:
		if err := s.pg.InsertWebGraphQL(session, m); err != nil {
			return err
		}
		return s.ch.InsertGraphQL(session, m)
	case *messages.JSException:
		wrapper, err := types.WrapJSException(m)
		if err != nil {
			s.log.Warn(sessCtx, "error on wrapping JSException: %v", err)
		}
		if err = s.pg.InsertWebErrorEvent(session, wrapper); err != nil {
			return err
		}
		if err := s.sessions.UpdateIssuesStats(session.SessionID, 1, 1000); err != nil {
			return err
		}
		return s.ch.InsertWebErrorEvent(session, wrapper)
	case *messages.IntegrationEvent:
		if err := s.pg.InsertWebErrorEvent(session, types.WrapIntegrationEvent(m)); err != nil {
			return err
		}
		return s.ch.InsertWebErrorEvent(session, types.WrapIntegrationEvent(m))
	case *messages.InputChange:
		if err := s.pg.InsertInputChangeEvent(session, m); err != nil {
			return err
		}
		if err := s.sessions.UpdateEventsStats(session.SessionID, 1, 0); err != nil {
			return err
		}
		return s.ch.InsertWebInputDuration(session, m)
	case *messages.MouseThrashing:
		if err := s.pg.InsertMouseThrashing(session, m); err != nil {
			return err
		}
		if err := s.sessions.UpdateIssuesStats(session.SessionID, 0, 50); err != nil {
			return err
		}
		return s.ch.InsertMouseThrashing(session, m)
	case *messages.CanvasNode:
		if err := s.pg.InsertCanvasNode(session, m); err != nil {
			return err
		}
	case *messages.TagTrigger:
		if err := s.pg.InsertTagTrigger(session, m); err != nil {
			return err
		}
	case *messages.PerformanceTrackAggr:
		if err := s.pg.InsertWebStatsPerformance(m); err != nil {
			return err
		}
		return s.ch.InsertWebPerformanceTrackAggr(session, m)
	}
	return nil
}
