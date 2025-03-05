import React from 'react';
import { Modal, Button, List, Divider } from 'antd';
import {
  CircleDot,
  Play,
  TrendingUp,
  Radio,
  Sparkles,
  Plug,
  ArrowRight,
} from 'lucide-react';
import { useHistory } from 'react-router-dom';
import { onboarding } from 'App/routes';
import { useStore } from 'App/mstore';
import { useTranslation } from 'react-i18next';

interface SpotToOpenReplayPromptProps {
  isVisible: boolean;
  onCancel: () => void;
}

function SpotToOpenReplayPrompt({
  isVisible,
  onCancel,
}: {
  isVisible: boolean;
  onCancel: () => void;
}) {
  const { userStore } = useStore();
  const history = useHistory();
  const { t } = useTranslation();

  const features = [
    { icon: <CircleDot />, text: t('Spot'), noBorder: true },
    { isDivider: true },
    { icon: <Play />, text: t('Session Replay & DevTools') },
    { icon: <TrendingUp />, text: t('Product Analytics') },
    {
      icon: <Radio />,
      text: t('Co-Browsing (Live Session Replay & Customer Support)'),
    },
    { icon: <Sparkles />, text: t('AI Powered Features') },
    { icon: <Plug />, text: t('Integrations & more') },
  ];

  const onUpgrade = () => {
    userStore.upgradeScope().then(() => {
      history.push(onboarding());
      onCancel();
    });
  };
  return (
    <Modal
      title={t('Setup OpenReplay')}
      visible={isVisible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {t('Cancel')}
        </Button>,
        <Button
          key="setup"
          type="primary"
          onClick={onUpgrade}
          className="gap-2"
        >
          {t('Setup OpenReplay Tracker')} <ArrowRight size={16} />
        </Button>,
      ]}
    >
      <p>
        {t(
          "By setting up OpenReplay, you'll unlock access to the following core features available under the OpenReplay free tier.",
        )}
      </p>
      <List
        itemLayout="horizontal"
        dataSource={features}
        renderItem={(item) =>
          item.isDivider ? (
            <Divider plain className="text-sm text-slate-500	">
              {t('+ Plus')}
            </Divider>
          ) : (
            <List.Item style={item.noBorder ? { borderBottom: 'none' } : {}}>
              <List.Item.Meta avatar={item.icon} title={item.text} />
            </List.Item>
          )
        }
      />
    </Modal>
  );
}

export default SpotToOpenReplayPrompt;
