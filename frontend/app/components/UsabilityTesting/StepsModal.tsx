import { UxTask } from "App/services/UxtestingService";
import React from 'react'
import { Button, Input, Switch, Typography } from 'antd'

function StepsModal({ onAdd, onHide }: { onAdd: (step: UxTask) => void; onHide: () => void }) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [isAnswerEnabled, setIsAnswerEnabled] = React.useState(false);

  const save = () => {
    onAdd({
      title: title,
      description: description || '',
      allowTyping: isAnswerEnabled,
    });
    onHide();
  };
  return (
    <div className={'h-screen p-4 bg-white flex flex-col gap-4'}>
      <Typography.Title style={{ marginBottom: 0 }} level={4}>
        Add a task or question
      </Typography.Title>
      <div className={'flex flex-col gap-1 items-start'}>
        <Typography.Title level={5} style={{ marginBottom: 4 }}>
          Title/Question
        </Typography.Title>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={'Task title'}
        />
        <Typography.Title level={5} style={{ marginBottom: 4 }}>
          Instructions
        </Typography.Title>
        <Input.TextArea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={'Task instructions'}
        />
        <Typography.Title level={5} style={{ marginBottom: 4 }}>
          Allow participants to type an answer
        </Typography.Title>
        <Switch
          checked={isAnswerEnabled}
          onChange={(checked) => setIsAnswerEnabled(checked)}
          checkedChildren="Yes"
          unCheckedChildren="No"
        />
        <div className={'text-disabled-text'}>
          Enabling this option will show a text field for participants to type their answer.
        </div>
      </div>
      <div className={'flex gap-2'}>
        <Button type={'primary'} onClick={save}>
          Add
        </Button>
        <Button onClick={onHide}>Cancel</Button>
      </div>
    </div>
  );
}

export default StepsModal;