import { Button } from '@/ui/actions/button';
import { toast } from '@/ui/overlays/toast';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { client, useStore } from 'App/mstore';
import { sessions, withSiteId } from 'App/routes';
import { useLocation, useNavigate } from 'App/routing';

import AuthScreen from '../Auth/AuthScreen';

function McpAuthorize() {
  const { t } = useTranslation();
  const { userStore, loginStore, projectsStore } = useStore();
  const accountName = userStore.account.name;
  const location = useLocation();
  const navigate = useNavigate();
  const [authorized, setAuthorized] = React.useState(false);

  const searchParams = new URLSearchParams(location.search);
  const state = searchParams.get('state');
  const clientId = searchParams.get('client_id');

  const openRoot = () => {
    navigate(withSiteId(sessions(), projectsStore.activeSiteId));
  };
  const handleAuthorize = async () => {
    try {
      const response = await client.post('/v1/mcp/authorize', {
        state,
        clientId,
      });
      const data = await response.json();
      if (data?.data?.success) {
        setAuthorized(true);
      } else if (data?.errors?.length) {
        toast.error(data.errors[0]);
      }
    } catch (e: any) {
      toast.error(e.message || 'Something went wrong');
    }
  };

  const handleLogout = () => {
    loginStore.invalidateSpotJWT();
    window.postMessage({ type: 'orspot:invalidate' }, '*');
    void userStore.logout();
  };

  return (
    <AuthScreen other={null} step={authorized ? 'done' : 'ask'}>
      <div className="m-auth__form">
        <header className="m-auth__head">
          <h1 className="m-auth__title" id="m-auth-title">
            {authorized ? t('Connected') : t('Connect the MCP app')}
          </h1>
          <p className="m-auth__lede">
            {authorized
              ? t('Authorization successful. You can close this page now.')
              : t(
                  'Openreplay MCP Application would like to connect to your account',
                )}
          </p>
        </header>
        <div className="m-auth__fields">
          {authorized ? null : (
            <>
              <p className="text-sm font-medium text-content-primary">
                {accountName}
              </p>
              {/* say who is asking: the request comes from a link, so the
                  person approving should see the client it names */}
              <p className="text-xs text-content-muted">
                {t('Requesting client')}:{' '}
                <span className="m-mono text-content-primary">
                  {clientId || t('unknown')}
                </span>
              </p>
            </>
          )}
          <div className="flex flex-col gap-2">
            {authorized ? null : (
              <>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={handleAuthorize}
                  // a link without a client and state has nothing to authorize
                  disabled={!clientId || !state}
                >
                  {t('Authorize')}
                </Button>
                <Button size="md" className="w-full" onClick={handleLogout}>
                  {t('Log out')}
                </Button>
              </>
            )}
            <Button variant="subtle" className="w-full" onClick={openRoot}>
              {t('Back to OpenReplay')}
            </Button>
          </div>
        </div>
      </div>
    </AuthScreen>
  );
}

export default McpAuthorize;
