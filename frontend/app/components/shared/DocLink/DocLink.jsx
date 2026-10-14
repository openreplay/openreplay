import { ExternalArrow } from '@/ui/actions/ExternalLink';
import { Button } from '@/ui/actions/button';
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
        {label}
        <ExternalArrow size={13} />
      </Button>
    </div>
  );
}
