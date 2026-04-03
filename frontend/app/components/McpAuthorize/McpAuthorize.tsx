import Logo from '@/layout/Logo';
import { Button, Card } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import APIClient from 'App/api_client';
import { useStore } from 'App/mstore';
import { sessions, withSiteId } from 'App/routes';
import { useLocation, useNavigate } from 'App/routing';

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
      const client = new APIClient();
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
    <div className="flex items-center justify-center bg-gray-lightest fixed top-0 bottom-0 left-0 right-0">
      <Card style={{ width: 400 }}>
        <div className="flex flex-col items-center gap-4">
          <Logo siteId={projectsStore.activeSiteId} />
          {authorized ? (
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                {t('Authorization successful. You can close this page now.')}
              </div>
              <div className="link" onClick={openRoot}>
                {t('Back to Openreplay')}
              </div>
            </div>
          ) : (
            <>
              <div className="text-center">
                <div>
                  {t(
                    'Openreplay MCP Application would like to connect to your account',
                  )}
                </div>
                <div className="font-semibold mt-1">{accountName}</div>
              </div>
              <div className="flex flex-col items-center gap-2 w-full mt-2">
                <Button type="primary" block onClick={handleAuthorize}>
                  {t('Authorize')}
                </Button>
                <Button block onClick={handleLogout}>
                  {t('Logout')}
                </Button>
                <div className="link mt-2" onClick={openRoot}>
                  {t('Back to Openreplay')}
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

export default McpAuthorize;
