import React from 'react';
import { Icon } from 'UI';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

interface IBottomButtons {
  loading: boolean;
  deleting: boolean;
  instance: Alert;
  onDelete: (instance: Alert) => void;
}

function BottomButtons({
  loading,
  instance,
  deleting,
  onDelete,
}: IBottomButtons) {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex items-center">
        <Button
          loading={loading}
          type="primary"
          htmlType="submit"
          disabled={loading || !instance.validate()}
          id="submit-button"
        >
          {instance.exists() ? t('Update') : t('Create')}
        </Button>
      </div>
      <div>
        {instance.exists() && (
          <Button
            type="text"
            loading={deleting}
            onClick={() => onDelete(instance)}
            id="trash-button"
            className="!text-teal !fill-teal"
          >
            <Icon name="trash" color="inherit" className="mr-2" size="18" />{' '}
            {t('Delete')}
          </Button>
        )}
      </div>
    </>
  );
}

export default BottomButtons;
