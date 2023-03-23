import React from 'react';
import Category from 'Components/Header/HealthStatus/ServiceCategory';
import cn from 'classnames';

function SubserviceHealth({
  subservice,
  name,
}: {
  name: string;
  subservice: { health: boolean; details: { errors?: string[]; version?: string } };
}) {
  const [isExpanded, setIsExpanded] = React.useState(!subservice?.health);

  const isExpandable = subservice?.details && Object.keys(subservice?.details).length > 0;
  return (
    <div className={cn(isExpanded && isExpandable ? 'bg-active-blue' : 'bg-white')}>
      <Category
        onClick={() => (isExpandable ? setIsExpanded(!isExpanded) : null)}
        name={name}
        healthOk={subservice?.health}
        isExpandable={isExpandable}
        isExpanded={isExpanded}
      />
      {isExpanded ? (
        <div className={'p-3'}>
          {subservice?.details?.version ? (
            <div className="flex items-center justify-between mt-2 px-2">
              <div className="py-1 px-2 font-medium">Version</div>
              <div className="code-font text-black rounded text-base bg-active-blue px-2 py-1 whitespace-nowrap overflow-hidden text-clip">
                {subservice?.details?.version}
              </div>
            </div>
          ) : null}
          {subservice?.details?.errors?.length ? (
            <div className={'py-2 px-4 bg-white rounded-xl border border-light-gray'}>
              <div>Error log:</div>
              {subservice.details.errors.map((err: string, i) => (
                <div className={'mt-2'} key={i + 1}>
                  {i + 1}. {err}
                </div>
              ))}
            </div>
          ) : subservice?.health ? null : (
            'Service not responding'
          )}
        </div>
      ) : null}
    </div>
  );
}

export default SubserviceHealth;
