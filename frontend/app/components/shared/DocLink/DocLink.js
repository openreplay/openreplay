import React from 'react';
import { Icon } from 'UI';
import { Button } from 'antd';

export default function DocLink({ className = '', url, label }) {
  const openLink = () => {
    window.open(url, '_blank');
  };

  return (
    <div className={className}>
      <Button
        type="text"
        onClick={openLink}
        className="flex items-center gap-2"
      >
        <span className="mr-2">{label}</span>
        <Icon name="external-link-alt" color="teal" />
      </Button>
    </div>
  );
}
