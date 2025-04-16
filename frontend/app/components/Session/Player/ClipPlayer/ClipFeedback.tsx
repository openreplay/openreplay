import React, { useRef } from 'react';
import { App, Button, ButtonProps } from 'antd';
import { useStore } from '@/mstore';
import { observer } from 'mobx-react-lite';
import {
  DislikeFilled,
  DislikeOutlined,
  LikeFilled,
  LikeOutlined,
} from '@ant-design/icons';
import { Tour, TourProps } from 'antd';
import { useTranslation } from 'react-i18next';

interface Props {
  clip?: any;
}

function ClipFeedback(props: Props) {
  const { t } = useTranslation();
  const { clipStore } = useStore();
  const { currentClip } = clipStore;
  const ref1 = useRef(null);
  const { message } = App.useApp();

  const steps: TourProps['steps'] = [
    {
      title: t('Upload File'),
      description: t('Put your files here.'),
      cover: (
        <div>
          <Button>{t('Upload')}</Button>
        </div>
      ),
      target: () => ref1.current,
    },
  ];

  const interestStatus = currentClip?.interested;
  const disabled = interestStatus != null;
  const isInterestedProps: ButtonProps =
    interestStatus === true
      ? {
          color: 'primary',
          variant: 'outlined',
          icon: <LikeFilled />,
        }
      : {
          icon: <LikeOutlined />,
          onClick: () => submitFeedback(true),
        };

  const isNotInterestedProps: ButtonProps =
    interestStatus === false
      ? {
          color: 'primary',
          variant: 'outlined',
          icon: <DislikeFilled />,
        }
      : {
          icon: <DislikeOutlined />,
          onClick: () => submitFeedback(false),
        };

  // if (disabled) {
  //     isInterestedProps.disabled = true;
  //     isNotInterestedProps.disabled = true;
  // } else {
  //     isInterestedProps.disabled = false;
  //     isNotInterestedProps.disabled = false;
  // }

  const submitFeedback = async (isInterested: boolean) => {
    await clipStore
      .sendFeedback(isInterested)
      .then(() => {
        message.success(t('Your feedback has been submitted'));
      })
      .catch(() => {
        message.error(t('There was an error submitting your feedback'));
      });
  };

  return (
    <div
      className="absolute right-0 bottom-0 z-10 flex flex-col gap-4 mr-4"
      style={{ marginBottom: '1rem' }}
    >
      {clipStore.tour && (
        <Tour
          open={clipStore.tour}
          steps={steps}
          onClose={() => clipStore.toggleTour()}
        />
      )}
      <Button ref={ref1} shape="circle" {...isInterestedProps} />
      <Button shape="circle" {...isNotInterestedProps} />
    </div>
  );
}

export default observer(ClipFeedback);
