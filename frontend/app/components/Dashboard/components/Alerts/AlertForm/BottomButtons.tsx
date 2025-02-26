import React from 'react';
import { Icon } from 'UI';
import { Button } from 'antd';

interface IBottomButtons {
  loading: boolean
  deleting: boolean
  instance: Alert
  onDelete: (instance: Alert) => void
}

function BottomButtons({
  loading, instance, deleting, onDelete,
}: IBottomButtons) {
  return (
    <>
      <div className="flex items-center">
        <Button
          loading={loading}
          type="primary"
          disabled={loading || !instance.validate()}
          id="submit-button"
        >
          {instance.exists() ? 'Update' : 'Create'}
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
          <Icon name="trash" color="inherit" className="mr-2" size="18" />
          {' '}
          Delete
        </Button>
        )}
      </div>
    </>
  );
}

export default BottomButtons;
