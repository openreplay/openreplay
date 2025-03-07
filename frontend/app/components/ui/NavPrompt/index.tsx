import { useCallback, useEffect } from 'react';
import { useBlocker } from 'react-router';

function NavigationPrompt({ when, message }: any) {
  const blocker = useCallback(
    (tx) => {
      if (!when) return false;

      if (typeof message === 'function') {
        const result = message(tx.nextLocation);
        if (result === true) return false;
      }

      return true;
    },
    [when, message]
  );

  const { state, proceed, reset, location: nextLocation } = useBlocker(blocker);

  useEffect(() => {
    if (state === 'blocked') {
      let promptMessage = 'Are you sure you want to leave this page?';
      if (typeof message === 'function') {
        const result = message(nextLocation);
        if (typeof result === 'string') {
          promptMessage = result;
        }
      } else if (typeof message === 'string') {
        promptMessage = message;
      }

      const confirmed = window.confirm(promptMessage);

      if (confirmed) {
        proceed();
      } else {
        reset();
      }
    }
  }, [state, proceed, reset, nextLocation, message]);

  return null;
}

export default NavigationPrompt;
