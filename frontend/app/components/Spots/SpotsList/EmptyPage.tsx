import { Modal } from 'antd';
import React, { useState } from 'react';

function EmptyPage() {
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  const handleWatchClick = () => {
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
  };

  return (
    <div>
      <div className="flex flex-col gap-4 items-center w-full p-8 bg-white rounded-lg shadow-sm mt-2">
        <div className="w-3/4 flex flex-col gap-3 justify-center items-center ">
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
        destroyOnClose
        width="820"
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
