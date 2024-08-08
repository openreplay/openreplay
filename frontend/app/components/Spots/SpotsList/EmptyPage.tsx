import { ChromeOutlined } from '@ant-design/icons';
import { Alert, Badge, Button } from 'antd';
import { ArrowUpRight, CirclePlay } from 'lucide-react';
import React from 'react';

function EmptyPage() {
  // const extKey = '__$spot_ext_exist$__';
  // const [extExist, setExtExist] = React.useState<boolean>(false);
  // React.useEffect(() => {
  //   let int: any;
  //   const v = localStorage.getItem(extKey);
  //   if (v) {
  //     setExtExist(true);
  //   } else {
  //     int = setInterval(() => {
  //       window.postMessage({ type: 'orspot:ping' }, '*');
  //     });
  //     const onSpotMsg = (e) => {
  //       if (e.data.type === 'orspot:pong') {
  //         setExtExist(true);
  //         localStorage.setItem(extKey, '1');
  //         clearInterval(int);
  //         int = null;
  //         window.removeEventListener('message', onSpotMsg);
  //       }
  //     };
  //     window.addEventListener('message', onSpotMsg);
  //   }
  //   return () => {
  //     if (int) {
  //       clearInterval(int);
  //     }
  //   };
  // }, []);
  const extExist = false;
  return (
    <div>
      <div
        className={
          'flex flex-col gap-4 items-center w-full p-8 bg-white rounded-b-lg shadow-sm'
        }
      >
        <div className={'font-semibold text-2xl'}>Spot your first bug.</div>
        <Button type="link">
          <CirclePlay /> Watch How
        </Button>
        <div>Your recordings will appear here.</div>
      </div>
      <div
        className={
          'bg-white shadow-sm rounded-lg p-8 mt-4 w-full flex flex-col gap-4 items-center'
        }
      >
        {extExist ? null : (
          <Alert
            message="It looks like you haven’t installed the Spot extension yet."
            type="warning"
            action={
              <Button
                type="primary"
                icon={<ChromeOutlined />}
                className="text-lg"
              >
                Get Chrome Extension <ArrowUpRight />
              </Button>
            }
            className="w-3/4 justify-between font-medium text-lg rounded-lg"
          />
        )}
        <div className={'flex gap-4 w-full justify-center'}>
          <div className={'border rounded bg-cyan-50'}>
            <img src={'assets/img/spot1.svg'} alt={'pin spot'} width={400} />
            <div className={'flex items-center gap-2 text-lg p-4'}>
              <Badge count={1} color="cyan" /> Pin Spot extension
            </div>
          </div>
          <div className={'border rounded bg-indigo-50'}>
            <img
              src={'assets/img/spot2.svg'}
              alt={'start recording'}
              width={400}
            />
            <div className={'flex items-center gap-2 text-lg p-4'}>
              <Badge count={2} color="cyan" /> Capture and share a bug
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmptyPage;
