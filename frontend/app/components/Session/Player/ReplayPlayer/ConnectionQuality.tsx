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
  [SignalQuality.Lowest]: 'No or very limited',
  [SignalQuality.Low]: 'Poor',
  [SignalQuality.Medium]: 'Average',
  [SignalQuality.High]: 'Good',
  [SignalQuality.Full]: 'Excellent',
};

function ConnectionQuality({ connection }: { connection: number }) {
  return (
    <div className="mx-2 flex items-center">
      <div className="font-semibold">Connection quality:</div>
      <div className="mb-1 ml-1">
      {SignalIcons[connection as SignalQuality] ??
        SignalIcons[SignalQuality.Full]}
      </div>
      <div>
        {signalTexts[connection as SignalQuality] ||
          signalTexts[SignalQuality.Full]}
      </div>
    </div>
  );
}

export default ConnectionQuality;
