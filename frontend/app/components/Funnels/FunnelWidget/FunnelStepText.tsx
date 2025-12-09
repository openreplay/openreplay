import React from 'react';
import { useTranslation } from 'react-i18next';
import FunnelStage from 'App/mstore/types/funnelStage';

interface Props {
  filter: FunnelStage;
  isHorizontal?: boolean;
}
function FunnelStepText(props: Props) {
  const { t } = useTranslation();
  const { filter } = props;
  const total = filter.value.length;
  const additionalStyle = props.isHorizontal
    ? {
        whiteSpace: 'nowrap',
        maxWidth: 210,
        textOverflow: 'ellipsis',
        overflow: 'hidden',
      }
    : {};

  const hasSubfilters =
    Array.isArray(filter.subfilters) && filter.subfilters.length > 0;

  return (
    <div
      className="color-gray-medium flex items-center gap-1"
      style={additionalStyle}
    >
      <span className="color-gray-darkest">{filter.label}</span>

      {hasSubfilters ? (
        <>
          <span className="mx-1">where</span>
          {filter.subfilters.map((sf, idx) => {
            const isLast = idx === filter.subfilters.length - 1;
            return (
              <React.Fragment key={idx}>
                <span className="font-medium color-gray-darkest">
                  {sf.name}
                </span>
                {sf.value.length ? (
                  <>
                    <span>{sf.operator}</span>
                    {sf.value.map((v, i) => (
                      <>
                        <span
                          className="font-medium color-gray-darkest"
                          key={i}
                        >
                          {v}
                        </span>
                        {i < sf.value.length - 1 && <span>{t('or')}</span>}
                      </>
                    ))}
                    {!isLast && filter.propertyOrder && (
                      <span className="mx-1 color-gray-medium">
                        {filter.propertyOrder}
                      </span>
                    )}
                  </>
                ) : null}
              </React.Fragment>
            );
          })}
        </>
      ) : (
        <>
          <span className="mx-1">{filter.operator}</span>
          {filter.value.map((value: any, index: number) => (
            <span key={index}>
              <span className="font-medium color-gray-darkest">
                "{String(value)}"
              </span>
              {index < total - 1 && (
                <span className="mx-1 color-gray-medium">{t('or')}</span>
              )}
            </span>
          ))}
        </>
      )}
    </div>
  );
}

export default FunnelStepText;
