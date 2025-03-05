import React from 'react';
import { LucideIcon } from 'lucide-react';

interface OptionProps {
  label: string;
  Icon: LucideIcon;
}

const Option: React.FC<OptionProps> = ({ label, Icon }) => (
  <div className="flex items-center gap-2">
    <Icon size={16} strokeWidth={1} />
    <div>{label}</div>
  </div>
);

export default Option;
