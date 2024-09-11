import { ChromeOutlined } from '@ant-design/icons';
import { Alert, Button, Modal } from 'antd';
import { ArrowUpRight } from 'lucide-react';
import React, { useState } from 'react';

function EmptyPage() {
  const extKey = '__$spot_ext_exist$__';
  const [extExist, setExtExist] = React.useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

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

  const handleWatchClick = () => {
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
  };

  return (
    <div>
      <div
        className={
          'flex flex-col gap-4 items-center w-full p-8 bg-white rounded-lg shadow-sm mt-2'
        }
      >
        <div className="w-3/4 flex flex-col gap-3 justify-center items-center ">
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

          <a
            href="#"
            onClick={handleWatchClick}
            className="rounded-xl overflow-hidden block hover:opacity-75"
          >
            <img
              src="/assets/img/spot-demo-cta.jpg"
              alt="Learn how to use OpenReplay Spot"
            />
          </a>
        </div>
      </div>

      <Modal
        title="Learn How to Spot Your First Bug"
        visible={isModalVisible}
        onCancel={handleModalClose}
        footer={null}
        centered
        className="aspect-video px-0 m-auto"
        destroyOnClose={true}
        width={'820'}
      >
        {isModalVisible && (
          <iframe
            width="800"
            height="450"
            src="https://www.youtube.com/embed/A8IzN9MuIYY?autoplay=1"
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="aspect-video m-auto"
            style={{ margin: 'auto' }}
          />
        )}
      </Modal>
    </div>
  );
}

export default EmptyPage;
