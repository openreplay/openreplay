import React from 'react';
import { Button } from 'antd';
import { useNavigate } from 'react-router';
import { LeftOutlined, ArrowLeftOutlined } from '@ant-design/icons';

function BackButton({ compact }: { compact?: boolean }) {
  const navigate = useNavigate()
  const siteId = location.pathname.split('/')[1];

  const handleBackClick = () => {
    navigate(`/${siteId}/dashboard`);
  };
  if (compact) {
    return (
      <Button onClick={handleBackClick} type={'text'} icon={<ArrowLeftOutlined />} />
    )
  }
  return (
    <Button type="text" onClick={handleBackClick} icon={<LeftOutlined />} className="px-1 pe-2 me-2 gap-1">
      Back
    </Button>
  );
}

export default BackButton;
