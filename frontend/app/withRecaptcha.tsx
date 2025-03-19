import React, { useState, useRef, ComponentType, ReactNode, useCallback, useEffect, useLayoutEffect } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { toast } from "react-toastify";

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
  const enabled = typeof window !== 'undefined' &&
    window.env?.CAPTCHA_ENABLED === 'true';

  const siteKey = typeof window !== 'undefined' ?
    window.env?.CAPTCHA_SITE_KEY || '' : '';

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
  options: WithCaptchaOptions = {}
): React.FC<P> => {
  // Default options
  const {
    position = 'hidden',
    errorMessage = 'Please complete the CAPTCHA verification',
    theme = 'light',
    size = 'invisible'
  } = options;

  const WithCaptchaComponent: React.FC<P> = (props: P) => {
    const { enabled: CAPTCHA_ENABLED, siteKey: CAPTCHA_SITE_KEY } = getCaptchaConfig();
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [isVerifyingCaptcha, setIsVerifyingCaptcha] = useState<boolean>(false);
    const [tokenExpired, setTokenExpired] = useState<boolean>(false);
    const recaptchaRef = useRef<ReCAPTCHA>(null);

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
        toast.warning('CAPTCHA verification expired. Please verify again.');
      }
    }, [CAPTCHA_ENABLED]);

    // Handle token change
    let onCaptchaChange = (token: string | null) => {
      console.log('Standard captcha callback received token:', !!token);
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

          // Special handling for invisible reCAPTCHA
          if (size === 'invisible') {
            // Create a direct token handler function
            const handleToken = (receivedToken: string | null) => {
              console.log('reCAPTCHA token received:', !!receivedToken);

              if (receivedToken) {
                // We have a token, resolve the promise
                const dataWithCaptcha = {
                  ...data,
                  'g-recaptcha-response': receivedToken
                };

                resolve(dataWithCaptcha);

                // Reset for next use
                setTimeout(() => {
                  recaptchaRef.current?.reset();
                  setIsVerifyingCaptcha(false);
                }, 100);
              }
            };

            // Set up a callback directly on the reCAPTCHA ref
            if (recaptchaRef.current) {
              console.log('Executing invisible reCAPTCHA');

              // Execute the reCAPTCHA challenge
              recaptchaRef.current.executeAsync()
                .then((token: string | null) => {
                  handleToken(token);
                })
                .catch((error: any) => {
                  console.error('reCAPTCHA execution failed:', error);
                  setIsVerifyingCaptcha(false);
                  reject(new Error('CAPTCHA verification failed'));
                });

              // Set a timeout in case the promise doesn't resolve
              setTimeout(() => {
                if (isVerifyingCaptcha) {
                  console.log('reCAPTCHA verification timed out');
                  setIsVerifyingCaptcha(false);
                  toast.error(errorMessage || 'Verification timed out. Please try again.');
                  reject(new Error('CAPTCHA verification timeout'));
                }
              }, 5000);
            } else {
              console.error('reCAPTCHA ref not available');
              setIsVerifyingCaptcha(false);
              reject(new Error('CAPTCHA component not initialized'));
            }
          } else if (captchaToken) {
            // Standard reCAPTCHA with token already available
            const dataWithCaptcha = {
              ...data,
              'g-recaptcha-response': captchaToken
            };

            resolve(dataWithCaptcha);
            recaptchaRef.current?.reset();
            setCaptchaToken(null);
            setIsVerifyingCaptcha(false);
          } else {
            // Standard reCAPTCHA but no token yet
            toast.error(errorMessage || 'Please complete the CAPTCHA verification');
            reject(new Error('CAPTCHA verification required'));
            setIsVerifyingCaptcha(false);
          }
        });
      },
      [CAPTCHA_ENABLED, captchaToken, errorMessage, size, isVerifyingCaptcha]
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
              <div className="text-red-500 text-sm mt-1">
                {errorMessage}
              </div>
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
    WrappedComponent.displayName ||
    WrappedComponent.name ||
    'Component';

  WithCaptchaComponent.displayName = `WithCaptcha(${wrappedComponentName})`;

  return WithCaptchaComponent;
};

export default withCaptcha;
