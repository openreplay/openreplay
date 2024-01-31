import React from 'react';
import Icon from 'UI/Icon';

function SummaryBlock() {
  return (
    <div style={summaryBlockStyle}>
      <div className={'flex items-center gap-2'}>
        <Icon name={'sparkles'} size={16} />
        <div className={'font-semibold text-xl'}>AI Summary</div>
      </div>

      <div className={'border border-gray-light rounded p-2 bg-white'}>
        Example text block
      </div>
    </div>
  );
}

const summaryBlockStyle: React.CSSProperties = {
  background: 'linear-gradient(156deg, #E3E6FF 0%, #E4F3F4 69.48%)',
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  padding: '1rem',
};

export default SummaryBlock;
