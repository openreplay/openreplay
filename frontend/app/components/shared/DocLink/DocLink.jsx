import { Button } from '@/ui/actions/button';
import { Icon } from '@/ui/icons/Icon';
import React from 'react';

export default function DocLink({ className = '', url, label }) {
  const openLink = () => {
    window.open(url, '_blank');
  };

  return (
    <div className={className}>
      <Button
        variant="subtle"
        onClick={openLink}
        className="flex items-center gap-2"
      >
        <span className="mr-2">{label}</span>
        <Icon name="external-link-alt" color="teal" />
      </Button>
    </div>
  );
}
