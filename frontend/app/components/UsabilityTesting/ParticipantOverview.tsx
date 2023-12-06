import React from 'react';
import { Typography } from 'antd';

function ParticipantOverviewItem({
  titleRow,
  firstNum,
  addedNum,
}: {
  titleRow: any;
  firstNum?: string;
  addedNum?: string;
}) {
  return (
    <div className={'rounded border p-2 flex-1'}>
      <div className={'flex items-center gap-2 mb-2'}>{titleRow}</div>
      <div className={'flex items-baseline gap-2'}>
        {firstNum ? <Typography.Title level={4}>{firstNum}</Typography.Title> : null}
        {addedNum ? <Typography.Text>{addedNum}</Typography.Text> : null}
      </div>
    </div>
  );
}

export default ParticipantOverviewItem;
