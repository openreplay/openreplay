import { ArrowRightOutlined } from '@ant-design/icons';
import { Button, Drawer, Space, Typography } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import CrispIframe from './CrispIframe';
import { Icon } from 'UI';
import ENV from '../../env';

const { Text } = Typography;

interface Props {
  onClose: () => void;
  open: boolean;
}

function SupportModal(props: Props) {
  const { onClose, open } = props;
  const WEBSITE_ID = ENV.CRISP_KEY;

  const { t } = useTranslation();

  return (
    <Drawer
      title={t('OpenReplay Support')}
      placement="right"
      open={open}
      width={400}
      onClose={onClose}
      closable={true}
      className="bg-gray-lightest"
    >
      <div className="flex flex-col items-center gap-2">
        <div className="p-3 bg-white flex rounded-lg shadow-xs hover:bg-indigo-lightest">
          <div className="shrink-0 w-10 mt-2">
            <Icon name="bookmark" size={18} />
          </div>

          <div className="flex flex-col">
            <Text className="font-medium">{t('Documentation')}</Text>
            <Text type="secondary" className="text-sm">
              {t(
                'Deploy, manage and customize OpenReplay through quick starts, tutorials, samples, and guides.',
              )}
            </Text>
            <div className="my-1" />
            <Button
              type="link"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0',
              }}
              onClick={() => {
                window.open('https://docs.openreplay.com');
              }}
            >
              <Space className="text-black">
                <div>{t('Browse Docs')}</div>
                <ArrowRightOutlined />
              </Space>
            </Button>
          </div>
        </div>

        <div className="p-3 bg-white flex rounded-lg shadow-xs hover:bg-indigo-lightest">
          <div className="shrink-0 w-10 mt-2">
            <Icon name="slack" size={18} />
          </div>
          <div className="flex flex-col">
            <Text className="font-medium">{t('Slack Community')}</Text>
            <Text type="secondary" className="text-sm">
              {t(
                'Ask OpenReplay community and get quick resolution to your questions from 1000+ members.',
              )}
            </Text>
            <div className="my-1" />
            <Button
              type="link"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0',
              }}
              onClick={() => {
                window.open('https://slack.openreplay.com', '_blank');
              }}
            >
              <Space className="text-black">
                <div>{t('Ask Community')}</div>
                <ArrowRightOutlined />
              </Space>
            </Button>
          </div>
        </div>

        <div className="p-3 bg-white flex rounded-lg shadow-xs hover:bg-indigo-lightest">
          <div className="shrink-0 w-10 mt-2">
            <Icon name="github" size={18} />
          </div>
          <div className="flex flex-col">
            <Text className="font-medium">{t('Github Repository')}</Text>
            <Text type="secondary" className="text-sm">
              {t(
                'Report issues or request features and get quick updates from our dev team.',
              )}
            </Text>
            <div className="my-1" />
            <Button
              type="link"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0',
              }}
              onClick={() => {
                window.open(
                  'https://github.com/openreplay/openreplay/issues',
                  '_blank',
                );
              }}
            >
              <Space className="text-black">
                <div>{t('Open GitHub')}</div>
                <ArrowRightOutlined />
              </Space>
            </Button>
          </div>
        </div>

        <CrispIframe WEBSITE_ID={WEBSITE_ID} />
      </div>
    </Drawer>
  );
}

export default SupportModal;
