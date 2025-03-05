import { Button, Input, Switch, Typography } from 'antd';
import React from 'react';

import { UxTask } from 'App/services/UxtestingService';
import { useTranslation } from 'react-i18next';

function StepsModal({
  onAdd,
  onHide,
  editTask,
  typingEnabled,
}: {
  onAdd: (step: UxTask) => void;
  onHide: () => void;
  editTask?: UxTask;
  typingEnabled?: boolean;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = React.useState(editTask?.title ?? '');
  const [description, setDescription] = React.useState(
    editTask?.description ?? '',
  );
  const [isAnswerEnabled, setIsAnswerEnabled] = React.useState(
    editTask?.allowTyping ?? typingEnabled,
  );

  const save = () => {
    onAdd({
      title,
      description: description || '',
      allowTyping: Boolean(isAnswerEnabled),
    });
    onHide();
  };

  return (
    <div className="h-screen p-4 bg-white flex flex-col gap-4">
      <Typography.Title style={{ marginBottom: 0 }} level={4}>
        {t('Add a task or question')}
      </Typography.Title>
      <div className="flex flex-col items-start">
        <Typography.Title level={5} style={{ marginBottom: 4 }}>
          {t('Title/Question')}
        </Typography.Title>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('Task title')}
        />
        <div className="text-sm mb-4 mt-2">
          <div className="font-semibold">{t('Example:')}</div>
          <ul className="list-disc list-inside">
            <li>{t('Task: Finding a specific product on shopping.com')}</li>
            <li>{t('Question: Find a specific product on shopping.com?')}</li>
          </ul>
        </div>
        <Typography.Title level={5} style={{ marginBottom: 4 }}>
          {t('Instructions')}
        </Typography.Title>
        <Input.TextArea
          value={description}
          rows={5}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('Task instructions')}
        />
        <div className="text-sm mb-4 mt-2">
          <div className="font-semibold">{t('Example:')}</div>
          <ol className="list-decimal list-inside">
            <li>{t('Search for "Sustainable T-shirt".')}</li>
            <li>{t('Pick a product from the results.')}</li>
            <li>{t('Note/Callout the ease of finding it.')}</li>
          </ol>
        </div>
        <Typography.Title level={5} style={{ marginBottom: 4 }}>
          {t('Allow participants to type an answer')}
        </Typography.Title>
        <Switch
          checked={isAnswerEnabled}
          onChange={(checked) => setIsAnswerEnabled(checked)}
          checkedChildren="Yes"
          unCheckedChildren="No"
        />
        <div className="text-sm mb-4 mt-1">
          {t(
            'Enabling this option will show a text field for participants to type their answer.',
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="primary" onClick={save} disabled={title === ''}>
          {editTask ? t('Save') : t('Add')}
        </Button>
        <Button onClick={onHide}>{t('Cancel')}</Button>
      </div>
    </div>
  );
}

export default StepsModal;
