import { toast } from '@/ui/overlays/toast';
import React, {
  ComponentType,
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

import ENV from '../env';

// Define a more specific type for submission data
export interface SubmissionData {
  [key: string]: any;
}

export interface WithCaptchaProps {
  submitWithCaptcha: (data: SubmissionData) => Promise<any>;
  hasCaptchaError: boolean;
  isVerifyingCaptcha: boolean;
  resetCaptcha: () => void;
}

export interface WithCaptchaOptions {
  position?: 'visible' | 'hidden';
  errorMessage?: string;
  theme?: 'light' | 'dark';
  size?: 'normal' | 'compact' | 'invisible';
}

// Safely get environment variables with fallbacks
const getCaptchaConfig = () => {
  const enabled =
    typeof window !== 'undefined' && ENV.CAPTCHA_ENABLED === 'true';

  const siteKey =
    typeof window !== 'undefined' ? ENV.CAPTCHA_SITE_KEY || '' : '';

  return { enabled, siteKey };
};

/**
 * Higher-Order Component that adds reCAPTCHA functionality to a form component
 *
 * @param WrappedComponent The component to wrap with CAPTCHA functionality
 * @param options Configuration options for the CAPTCHA behavior
 * @returns A new component with CAPTCHA capabilities
 */
const withCaptcha = <P extends object>(
  WrappedComponent: ComponentType<P & WithCaptchaProps>,
  options: WithCaptchaOptions = {},
): React.FC<P> => {
  // Default options
  const {
    position = 'hidden',
    errorMessage = 'Please complete the CAPTCHA verification',
    theme = 'light',
    size = 'invisible',
  } = options;

  const WithCaptchaComponent: React.FC<P> = (props: P) => {
    const { enabled: CAPTCHA_ENABLED, siteKey: CAPTCHA_SITE_KEY } =
      getCaptchaConfig();
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [isVerifyingCaptcha, setIsVerifyingCaptcha] =
      useState<boolean>(false);
    const [tokenExpired, setTokenExpired] = useState<boolean>(false);
    const recaptchaRef = useRef<ReCAPTCHA>(null);
    const verifyTimer = useRef<number | undefined>(undefined);
    useEffect(() => () => window.clearTimeout(verifyTimer.current), []);

    // Reset token when expired
    useEffect(() => {
      if (tokenExpired) {
        setCaptchaToken(null);
        setTokenExpired(false);
      }
    }, [tokenExpired]);

    // Handle token expiration
    const onCaptchaExpired = useCallback(() => {
      setTokenExpired(true);
      if (CAPTCHA_ENABLED) {
        toast.warning('CAPTCHA verification expired. Please verify again.', {
          toastId: 'captcha-expired',
        });
      }
    }, [CAPTCHA_ENABLED]);

    // Handle token change
    const onCaptchaChange = (token: string | null) => {
      setCaptchaToken(token);
      setTokenExpired(false);
    };

    // Reset captcha manually
    const resetCaptcha = useCallback(() => {
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    }, []);

    // Submit with captcha verification
    const submitWithCaptcha = useCallback(
      (data: SubmissionData): Promise<any> => {
        return new Promise((resolve, reject) => {
          if (!CAPTCHA_ENABLED) {
            // CAPTCHA not enabled, resolve with original data
            resolve(data);
            return;
          }

          setIsVerifyingCaptcha(true);

          if (size === 'invisible') {
            if (!recaptchaRef.current) {
              setIsVerifyingCaptcha(false);
              reject(new Error('CAPTCHA component not initialized'));
              return;
            }
            // settles exactly once: token, failure, null token or timeout
            let settled = false;
            const settle = (token: string | null, error?: string) => {
              if (settled) return;
              settled = true;
              window.clearTimeout(timer);
              setIsVerifyingCaptcha(false);
              recaptchaRef.current?.reset();
              if (token) resolve({ ...data, 'g-recaptcha-response': token });
              else {
                if (error) toast.error(error);
                reject(new Error('CAPTCHA verification failed'));
              }
            };
            const timer = window.setTimeout(
              () => settle(null, 'Verification timed out. Please try again.'),
              60000,
            );
            verifyTimer.current = timer;
            recaptchaRef.current
              .executeAsync()
              .then((token: string | null) => settle(token, errorMessage))
              .catch(() => settle(null, errorMessage));
          } else if (captchaToken) {
            // Standard reCAPTCHA with token already available
            const dataWithCaptcha = {
              ...data,
              'g-recaptcha-response': captchaToken,
            };

            resolve(dataWithCaptcha);
            recaptchaRef.current?.reset();
            setCaptchaToken(null);
            setIsVerifyingCaptcha(false);
          } else {
            // Standard reCAPTCHA but no token yet
            toast.error(
              errorMessage || 'Please complete the CAPTCHA verification',
            );
            reject(new Error('CAPTCHA verification required'));
            setIsVerifyingCaptcha(false);
          }
        });
      },
      [CAPTCHA_ENABLED, captchaToken, errorMessage, size],
    );

    const hasCaptchaError = !captchaToken && CAPTCHA_ENABLED === true;

    return (
      <>
        {CAPTCHA_ENABLED && (
          <div className={position === 'hidden' ? 'sr-only' : 'mb-4'}>
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={CAPTCHA_SITE_KEY}
              onChange={onCaptchaChange}
              onExpired={onCaptchaExpired}
              theme={theme}
              size={size}
            />
            {hasCaptchaError && (
              <div className="text-red-500 text-sm mt-1">{errorMessage}</div>
            )}
          </div>
        )}
        <WrappedComponent
          {...props}
          submitWithCaptcha={submitWithCaptcha}
          hasCaptchaError={hasCaptchaError}
          isVerifyingCaptcha={isVerifyingCaptcha}
          resetCaptcha={resetCaptcha}
        />
      </>
    );
  };

  // Display name for debugging
  const wrappedComponentName =
    WrappedComponent.displayName || WrappedComponent.name || 'Component';

  WithCaptchaComponent.displayName = `WithCaptcha(${wrappedComponentName})`;

  return WithCaptchaComponent;
};

export default withCaptcha;
