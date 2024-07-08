import { Button, Input, Switch, Typography } from 'antd';
import React from 'react';



import { UxTask } from 'App/services/UxtestingService';


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
  const [title, setTitle] = React.useState(editTask?.title ?? '');
  const [description, setDescription] = React.useState(
    editTask?.description ?? ''
  );
  const [isAnswerEnabled, setIsAnswerEnabled] = React.useState(
    editTask?.allowTyping ?? typingEnabled
  );

  const save = () => {
    onAdd({
      title: title,
      description: description || '',
      allowTyping: Boolean(isAnswerEnabled),
    });
    onHide();
  };

  return (
    <div className={'h-screen p-4 bg-white flex flex-col gap-4'}>
      <Typography.Title style={{ marginBottom: 0 }} level={4}>
        Add a task or question
      </Typography.Title>
      <div className={'flex flex-col items-start'}>
        <Typography.Title level={5} style={{ marginBottom: 4 }}>
          Title/Question
        </Typography.Title>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={'Task title'}
        />
        <div className={'text-sm mb-4 mt-2'}>
          <div className={'font-semibold'}>Example:</div>
          <ul className={'list-disc list-inside'}>
            <li>Task: Finding a specific product on shopping.com</li>
            <li>Question: Find a specific product on shopping.com?</li>
          </ul>
        </div>
        <Typography.Title level={5} style={{ marginBottom: 4 }}>
          Instructions
        </Typography.Title>
        <Input.TextArea
          value={description}
          rows={5}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={'Task instructions'}
        />
        <div className={'text-sm mb-4 mt-2'}>
          <div className={'font-semibold'}>Example:</div>
          <ol className={'list-decimal list-inside'}>
            <li>Search for "Sustainable T-shirt".</li>
            <li>Pick a product from the results.</li>
            <li>Note/Callout the ease of finding it.</li>
          </ol>
        </div>
        <Typography.Title level={5} style={{ marginBottom: 4 }}>
          Allow participants to type an answer
        </Typography.Title>
        <Switch
          checked={isAnswerEnabled}
          onChange={(checked) => setIsAnswerEnabled(checked)}
          checkedChildren="Yes"
          unCheckedChildren="No"
        />
        <div className={'text-sm mb-4 mt-1'}>
          Enabling this option will show a text field for participants to type
          their answer.
        </div>
      </div>
      <div className={'flex gap-2'}>
        <Button type={'primary'} onClick={save} disabled={title === ''}>
          {editTask ? 'Save' : 'Add'}
        </Button>
        <Button onClick={onHide}>Cancel</Button>
      </div>
    </div>
  );
}

export default StepsModal;
