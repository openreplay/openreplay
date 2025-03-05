import React from 'react';
import { observer } from 'mobx-react-lite';
import { Icon } from 'UI';
import { Button } from 'antd';
import cn from 'classnames';
import FeatureFlag from 'App/mstore/types/FeatureFlag';
import { useTranslation } from 'react-i18next';

function Description({
  isDescrEditing,
  current,
  setEditing,
  showDescription,
}: {
  showDescription: boolean;
  isDescrEditing: boolean;
  current: FeatureFlag;
  setEditing: ({ isDescrEditing }: { isDescrEditing: boolean }) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <label>
        <span className="font-semibold">{t('Description')}&nbsp;</span>{' '}
        <span className="text-disabled-text text-sm">({t('Optional')})</span>
      </label>
      {isDescrEditing ? (
        <textarea
          name="flag-description"
          placeholder={t('Description...')}
          rows={3}
          autoFocus
          className="rounded fluid border px-2 py-1 w-full"
          value={current.description}
          onChange={(e) => {
            if (current) current.setDescription(e.target.value);
          }}
          onBlur={() => setEditing({ isDescrEditing: false })}
          onFocus={() => setEditing({ isDescrEditing: true })}
        />
      ) : showDescription ? (
        <div
          onClick={() => setEditing({ isDescrEditing: true })}
          className={cn(
            'cursor-pointer border-b w-fit',
            'border-b-borderColor-transparent hover:border-dotted hover:border-gray-medium',
          )}
        >
          {current.description}
        </div>
      ) : (
        <Button
          type="text"
          icon={<Icon name="edit" size={16} />}
          onClick={() => setEditing({ isDescrEditing: true })}
        >
          {t('Add')}
        </Button>
      )}
    </>
  );
}

export default observer(Description);
