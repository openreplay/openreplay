/** Saas
import React from 'react'
import { Switch, } from 'antd'
import { Icon } from 'UI';
import { useTranslation } from 'react-i18next';
import { gradientButton, onHoverFillStyle, fillStyle } from './Controls';

function SummaryButton({
  onClick,
  withToggle,
  onToggle,
  toggleValue,
}: {
  onClick?: () => void;
  withToggle?: boolean;
  onToggle?: () => void;
  toggleValue?: boolean;
}) {
  const { t } = useTranslation();
  const [isHovered, setHovered] = React.useState(false);

  return (
    <div style={gradientButton} onClick={onClick}>
      <div
        style={isHovered ? onHoverFillStyle : fillStyle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {withToggle ? (
          <Switch size="small" checked={toggleValue} onChange={onToggle} />
        ) : null}
        <Icon name="sparkles" size={16} />
        <div className="font-semibold text-main">{t('Summary AI')}</div>
      </div>
    </div>
  );
}
*/

function SummaryButton(props: any) {
  return null;
}

export default SummaryButton;
