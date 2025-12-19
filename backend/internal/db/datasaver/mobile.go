package datasaver

import (
	"openreplay/backend/pkg/messages"
	sdk "openreplay/backend/pkg/sdk/model"
	"openreplay/backend/pkg/sessions"
)

func (s *saverImpl) handleMobileMessage(session *sessions.Session, msg messages.Message) error {
	switch m := msg.(type) {
	case *messages.MobileSessionEnd:
		return s.ch.InsertMobileSession(session)
	case *messages.MobileUserID:
		if err := s.sessions.UpdateUserID(session.SessionID, m.ID); err != nil {
			return err
		}
		if err := s.users.Add(session, sdk.NewUser(m.ID)); err != nil {
			return err
		}
		return s.ch.InsertAutocomplete(session, "USERIDMOBILE", m.ID)
	case *messages.MobileUserAnonymousID:
		if err := s.sessions.UpdateAnonymousID(session.SessionID, m.ID); err != nil {
			return err
		}
		return s.ch.InsertAutocomplete(session, "USERANONYMOUSIDMOBILE", m.ID)
	case *messages.MobileMetadata:
		return s.sessions.UpdateMetadata(m.SessionID(), m.Key, m.Value)
	case *messages.MobileEvent:
		return s.ch.InsertMobileCustom(session, m)
	case *messages.MobileClickEvent:
		if err := s.ch.InsertMobileClick(session, m); err != nil {
			return err
		}
		return s.sessions.UpdateEventsStats(session.SessionID, 1, 0)
	case *messages.MobileSwipeEvent:
		if err := s.ch.InsertMobileSwipe(session, m); err != nil {
			return err
		}
		return s.sessions.UpdateEventsStats(session.SessionID, 1, 0)
	case *messages.MobileInputEvent:
		if err := s.ch.InsertMobileInput(session, m); err != nil {
			return err
		}
		return s.sessions.UpdateEventsStats(session.SessionID, 1, 0)
	case *messages.MobileNetworkCall:
		return s.ch.InsertMobileRequest(session, m, session.SaveRequestPayload)
	case *messages.MobileCrash:
		return s.ch.InsertMobileCrash(session, m)
	}
	return nil
}
