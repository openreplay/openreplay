import { Switch } from '@/ui/inputs/switch';
import React, { useState } from 'react';

function ToggleContent({ label = '', first, second }) {
  const [switched, setSwitched] = useState(true);
  return (
    <div>
      <div className="flex items-center cursor-pointer mb-4">
        <div className="mr-2" onClick={() => setSwitched(!switched)}>
          {label}
        </div>
        <Switch
          onCheckedChange={() => setSwitched(!switched)}
          checked={!switched}
        />
      </div>
      <div>{switched ? first : second}</div>
    </div>
  );
}

export default ToggleContent;
