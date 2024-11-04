import React from 'react'
import { ChromeOutlined } from '@ant-design/icons';
import { Alert, Button } from 'antd';
import { ArrowUpRight } from 'lucide-react';

function InstallCTA() {
  const extKey = '__$spot_ext_exist$__';
  const [extExist, setExtExist] = React.useState<boolean>(false);

  React.useEffect(() => {
    let int: any;
    const v = localStorage.getItem(extKey);
    if (v) {
      setExtExist(true);
    } else {
      int = setInterval(() => {
        window.postMessage({ type: 'orspot:ping' }, '*');
      });
      const onSpotMsg = (e: any) => {
        if (e.data.type === 'orspot:pong') {
          setExtExist(true);
          localStorage.setItem(extKey, '1');
          clearInterval(int);
          int = null;
          window.removeEventListener('message', onSpotMsg);
        }
      };
      window.addEventListener('message', onSpotMsg);
    }
    return () => {
      if (int) {
        clearInterval(int);
      }
    };
  }, []);
  return (
    <>
    {extExist ? null : (
        <Alert
          message="It looks like you haven’t installed the Spot extension yet."
          type="warning"
          action={
            <Button
              type="primary"
              icon={<ChromeOutlined />}
              className="text-lg"
              onClick={() =>
                window.open(
                  'https://chromewebstore.google.com/detail/openreplay-spot-record-re/ckigbicapkkgfomcfmcbaaplllopgbid?pli=1',
                  '_blank'
                )
              }
            >
              Get Chrome Extension <ArrowUpRight />
            </Button>
          }
          className="w-full justify-between font-medium text-lg rounded-lg border-0 mb-4"
        />
      )}
    </>
  )
}

export default InstallCTA