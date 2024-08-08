import { Button } from 'antd';
import { MoveUpRight } from 'lucide-react';
import React from 'react';

function EmptyPage() {
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
      const onSpotMsg = (e) => {
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
    <div>
      <div
        className={
          'flex flex-col gap-4 items-center w-full p-8 bg-white rounded-b-lg shadow-sm'
        }
      >
        <div className={'font-semibold text-xl'}>Spot your first bug.</div>
        <div className={'link font-semibold'}>Watch How</div>
        <div>Your recordings will appear here.</div>
      </div>
      <div
        className={
          'bg-white shadow-sm rounded-lg p-8 mt-4 w-full flex flex-col gap-4 items-center'
        }
      >
        {extExist ? null : (
          <div
            className={
              'border rounded  bg-[#FFF7E6] py-2 px-4 flex items-center justify-between'
            }
            style={{ width: 'calc(804px + 1rem)' }}
          >
            <div>
              It looks like you haven't installed the Spot extension yet.
            </div>
            <Button
              type="primary"
              size="small"
              className="flex items-center rounded-xl shadow-none border border-transparent hover:border"
            >
              <div className="w-50 pb-0.5">
                <img
                  src={'assets/img/chrome.svg'}
                  alt={'Get Spot by OpenReplay'}
                  width={16}
                />
              </div>
              Get Chrome Extension <MoveUpRight size={16} strokeWidth={1.5} />
            </Button>
          </div>
        )}
        <div className={'flex gap-4 w-full justify-center'}>
          <div className={'border rounded bg-white'}>
            <img src={'assets/img/spot1.jpg'} alt={'pin spot'} width={400} />
            <div className={'p-4 text-center font-semibold'}>
              Pin Spot for Easy Access
            </div>
          </div>
          <div className={'border rounded bg-[#E2E4F6]'}>
            <img
              src={'assets/img/spot2.jpg'}
              alt={'start recording'}
              width={400}
            />
            <div className={'p-4 text-center font-semibold'}>
              Click the Spot Icon to Record Bugs
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmptyPage;
