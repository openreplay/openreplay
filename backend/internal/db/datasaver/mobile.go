package datasaver

import (
	"context"

	"openreplay/backend/pkg/messages"
	"openreplay/backend/pkg/sessions"
)

func (s *saverImpl) handleMobileMessage(sessCtx context.Context, session *sessions.Session, msg messages.Message) error {
	switch m := msg.(type) {
	case *messages.MobileSessionEnd:
		return s.ch.InsertMobileSession(session)
	case *messages.MobileUserID:
		if err := s.sessions.UpdateUserID(session.SessionID, m.ID); err != nil {
			return err
		}
		s.pg.InsertAutocompleteValue(session.SessionID, session.ProjectID, "USERIDMOBILE", m.ID)
		return nil
	case *messages.MobileUserAnonymousID:
		if err := s.sessions.UpdateAnonymousID(session.SessionID, m.ID); err != nil {
			return err
		}
		s.pg.InsertAutocompleteValue(session.SessionID, session.ProjectID, "USERANONYMOUSIDMOBILE", m.ID)
		return nil
	case *messages.MobileMetadata:
		return s.sessions.UpdateMetadata(m.SessionID(), m.Key, m.Value)
	case *messages.MobileEvent:
		if err := s.pg.InsertMobileEvent(session, m); err != nil {
			return err
		}
		return s.ch.InsertMobileCustom(session, m)
	case *messages.MobileClickEvent:
		if err := s.pg.InsertMobileClickEvent(session, m); err != nil {
			return err
		}
		if err := s.sessions.UpdateEventsStats(session.SessionID, 1, 0); err != nil {
			return err
		}
		return s.ch.InsertMobileClick(session, m)
	case *messages.MobileSwipeEvent:
		if err := s.pg.InsertMobileSwipeEvent(session, m); err != nil {
			return err
		}
		if err := s.sessions.UpdateEventsStats(session.SessionID, 1, 0); err != nil {
			return err
		}
		return s.ch.InsertMobileSwipe(session, m)
	case *messages.MobileInputEvent:
		if err := s.pg.InsertMobileInputEvent(session, m); err != nil {
			return err
		}
		if err := s.sessions.UpdateEventsStats(session.SessionID, 1, 0); err != nil {
			return err
		}
		return s.ch.InsertMobileInput(session, m)
	case *messages.MobileNetworkCall:
		if err := s.pg.InsertMobileNetworkCall(session, m); err != nil {
			return err
		}
		return s.ch.InsertMobileRequest(session, m, session.SaveRequestPayload)
	case *messages.MobileCrash:
		if err := s.pg.InsertMobileCrash(session.SessionID, session.ProjectID, m); err != nil {
			return err
		}
		if err := s.sessions.UpdateIssuesStats(session.SessionID, 1, 1000); err != nil {
			return err
		}
		return s.ch.InsertMobileCrash(session, m)
	}
	return nil
}
