import React, { useState } from 'react';
import { Switch } from 'antd';

function ToggleContent({ label = '', first, second }) {
  const [switched, setSwitched] = useState(true);
  return (
    <div>
      <div className="flex items-center cursor-pointer mb-4">
        <div className="mr-2" onClick={() => setSwitched(!switched)}>
          {label}
        </div>
        <Switch onChange={() => setSwitched(!switched)} checked={!switched} />
      </div>
      <div>{switched ? first : second}</div>
    </div>
  );
}

export default ToggleContent;
