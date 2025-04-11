import React from 'react';
import cn from 'classnames';
import { Icon } from 'UI';
import { useTranslation } from 'react-i18next';

interface Props {
  integration: any;
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  integrated?: boolean;
  hide?: boolean;
  useIcon?: boolean;
}

function IntegrationItem(props: Props) {
  const { t } = useTranslation();
  const { integration, integrated, hide = false, useIcon } = props;
  return hide ? null : (
    <div
      className={cn(
        'flex flex-col border rounded-lg p-3 bg-white relative justify-between cursor-pointer hover:bg-active-blue',
      )}
      onClick={(e) => props.onClick(e)}
      style={{ height: '136px' }}
    >
      <div className="flex gap-3">
        <div className="shrink-0">
          {useIcon ? (
            <Icon name={integration.icon} size={40} />
          ) : (
            <img
              className="h-10 w-10"
              src={`/assets/${integration.icon}.svg`}
              alt="integration"
            />
          )}
        </div>
        <div className="flex flex-col">
          <h4 className="text-lg">{integration.title}</h4>
          <p className="text-sm color-gray-medium m-0 p-0 h-3">
            {integration.subtitle && integration.subtitle}
          </p>
        </div>
      </div>

      {integrated && (
        <div className="ml-12 p-1 flex items-center justify-center color-tealx border rounded w-fit">
          <Icon
            name="check-circle-fill"
            size="14"
            color="tealx"
            className="mr-2"
          />
          <span>{t('Integrated')}</span>
        </div>
      )}
    </div>
  );
}

export default IntegrationItem;
