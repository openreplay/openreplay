import React from 'react';
import { Icon } from 'UI';
import { Button, Drawer, Space, Typography } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface Props {
  onClose: () => void;
  open: boolean;
}

function SupportModal(props: Props) {
  const { onClose, open } = props;
  const WEBSITE_ID = window.env.CRISP_KEY;
  return (
    <Drawer title='OpenReplay Support' placement='right' open={open} width={400} onClose={onClose}
            closable={false}>
      <div className='flex flex-col items-center'>
        <div className='border p-3 bg-white flex rounded'>
          <div className='shrink-0 w-10 mt-2'>
            <Icon name='bookmark' size={18} />
          </div>
          <div className='flex flex-col'>
            <Text className='font-medium'>Documentation</Text>
            <Text type='secondary' className='text-sm'>
              Deploy, manage and customize OpenReplay through quick starts, tutorials, samples, and guides.
            </Text>
            <div className='my-1' />
            <Button type='link' style={{ display: 'flex', justifyContent: 'space-between', padding: '0' }}
                    onClick={() => {
                      window.open('https://docs.openreplay.com');
                    }}>
              <Space>
                <div>Browse Docs</div>
                <ArrowRightOutlined />
              </Space>
            </Button>
          </div>
        </div>

        <div className='my-2' />

        <div className='border p-3 bg-white flex rounded'>
          <div className='shrink-0 w-10 mt-2'>
            <Icon name='slack' size={18} />
          </div>
          <div className='flex flex-col'>
            <Text className='font-medium'>Slack Community</Text>
            <Text type='secondary' className='text-sm'>
              Ask OpenReplay community and get quick resolution to your questions from 1000+ members.
            </Text>
            <div className='my-1' />
            <Button type='link'
                    style={{ display: 'flex', justifyContent: 'space-between', padding: '0' }}
                    onClick={() => {
                      window.open('https://slack.openreplay.com', '_blank');
                    }}>
              <Space>
                <div>Ask Community</div>
                <ArrowRightOutlined />
              </Space>
            </Button>
          </div>
        </div>

        <div className='my-2' />

        {!!WEBSITE_ID && (
          <div className='flex rounded border w-full'>
            <iframe src={`https://go.crisp.chat/chat/embed/?website_id=${WEBSITE_ID}`}
                    style={{ height: '415px', margin: '0', padding: '0', width: '100%' }} />
          </div>
        )}
      </div>
    </Drawer>
  );
}

export default SupportModal;