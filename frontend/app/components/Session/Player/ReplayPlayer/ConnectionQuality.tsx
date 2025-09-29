import React from 'react';
import {
  SignalZero,
  SignalLow,
  SignalMedium,
  SignalHigh,
  Signal,
  CircleAlert,
} from 'lucide-react';
import { Tooltip } from 'antd';

enum SignalQuality {
  Lowest,
  Low,
  Medium,
  High,
  Full,
}

const SignalIcons = {
  [SignalQuality.Lowest]: (
    <div className="flex items-center gap-1 text-red">
      <SignalZero size={16} />
      <CircleAlert size={16} />
    </div>
  ),
  [SignalQuality.Low]: <SignalLow size={16} className="text-red" />,
  [SignalQuality.Medium]: <SignalMedium size={16} className="text-yellow" />,
  [SignalQuality.High]: <SignalHigh size={16} className="text-green" />,
  [SignalQuality.Full]: <Signal size={16} className="text-green" />,
};

const signalTexts = {
  [SignalQuality.Lowest]: 'No or very limited connection',
  [SignalQuality.Low]: 'Poor connection',
  [SignalQuality.Medium]: 'Average connection',
  [SignalQuality.High]: 'Good connection',
  [SignalQuality.Full]: 'Excellent connection',
};

function ConnectionQuality({ connection }: { connection: number }) {
  return (
    <div className="mx-2">
      <Tooltip
        title={
          signalTexts[connection as SignalQuality] ||
          signalTexts[SignalQuality.Full]
        }
      >
        {SignalIcons[connection as SignalQuality] ??
          SignalIcons[SignalQuality.Full]}
      </Tooltip>
    </div>
  );
}

export default ConnectionQuality;
