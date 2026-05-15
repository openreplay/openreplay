import React from 'react';
import { Tooltip } from 'antd';
import { Icon } from 'UI';

interface Props {
  size?: number;
  className?: string;
}

const DbIPNotice = () => null;

// saas only for now
// const DbIPNotice: React.FC<Props> = ({ size = 14, className = '' }) => (
//   <Tooltip
//     title={
//       <a
//         href="https://db-ip.com"
//         target="_blank"
//         rel="noopener noreferrer"
//         style={{ color: 'inherit', textDecoration: 'underline' }}
//       >
//         Geolocation by DB-IP
//       </a>
//     }
//   >
//     <span className={`inline-flex items-center ${className}`}>
//       <Icon name="info-circle" size={size} />
//     </span>
//   </Tooltip>
// );

export default DbIPNotice;
