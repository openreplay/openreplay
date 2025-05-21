import React from 'react';
import { Button, Input, Tooltip } from 'antd';
import { SendHorizonal, OctagonX } from 'lucide-react';
import { kaiStore } from '../KaiStore';
import { observer } from 'mobx-react-lite';
import Usage from './Usage';

function ChatInput({
  isLoading,
  onSubmit,
  threadId,
}: {
  isLoading?: boolean;
  onSubmit: (str: string) => void;
  threadId: string;
}) {
  const inputRef = React.useRef<typeof Input>(null);
  const usage = kaiStore.usage;
  const limited = usage.percent >= 100;
  const inputValue = kaiStore.queryText;
  const isProcessing = kaiStore.processingStage !== null;
  const setInputValue = (text: string) => {
    kaiStore.setQueryText(text);
  };

  const submit = () => {
    if (limited) {
      return;
    }
    if (isProcessing) {
      const settings = { projectId: '2325', userId: '0', threadId };
      void kaiStore.cancelGeneration(settings);
    } else {
      if (inputValue.length > 0) {
        onSubmit(inputValue);
        setInputValue('');
      }
    }
  };

  const cancelReplace = () => {
    setInputValue('');
    kaiStore.setReplacing(null);
  };

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputValue]);

  const isReplacing = kaiStore.replacing !== null;

  return (
    <div className="relative">
      <Input
        onPressEnter={submit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            cancelReplace();
          }
        }}
        ref={inputRef}
        placeholder={
          limited
            ? `You've reached the daily limit for queries, come again tomorrow!`
            : 'Ask anything about your product and users...'
        }
        size={'large'}
        disabled={limited}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        suffix={
          <>
            {isReplacing ? (
              <Tooltip title={'Cancel Editing'}>
                <Button
                  onClick={cancelReplace}
                  icon={<OctagonX size={16} />}
                  type={'text'}
                  size={'small'}
                  shape={'circle'}
                  disabled={limited}
                />
              </Tooltip>
            ) : null}
            <Tooltip title={'Send message'}>
              <Button
                loading={isLoading}
                onClick={submit}
                disabled={limited}
                icon={
                  isProcessing ? (
                    <OctagonX size={16} />
                  ) : (
                    <SendHorizonal size={16} />
                  )
                }
                type={'text'}
                size={'small'}
                shape={'circle'}
              />
            </Tooltip>
          </>
        }
      />
      <div className="absolute ml-1 top-2 -right-11">
        <Usage />
      </div>
    </div>
  );
}

export default observer(ChatInput);
