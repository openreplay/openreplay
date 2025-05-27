import React from 'react';
import { Button, Input, Tooltip } from 'antd';
import { X, ArrowUp } from 'lucide-react';
import { kaiStore } from '../KaiStore';
import { observer } from 'mobx-react-lite';
import Usage from './Usage';

function ChatInput({
  isLoading,
  onSubmit,
  isArea,
  onCancel,
}: {
  isLoading?: boolean;
  onSubmit: (str: string) => void;
  onCancel: () => void;
  isArea?: boolean;
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
      onCancel();
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
  const placeholder = limited
    ? `You've reached the daily limit for queries, come again tomorrow!`
    : 'Ask anything about your product and users...';
  if (isArea) {
    return (
      <div className="relative">
        <Input.TextArea
          rows={3}
          className="!resize-none rounded-lg shadow"
          onPressEnter={submit}
          ref={inputRef}
          placeholder={placeholder}
          size={'large'}
          disabled={limited}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <div className="absolute bottom-2 right-2">
          <SendButton
            isLoading={isLoading}
            submit={submit}
            limited={limited}
            isProcessing={isProcessing}
          />
        </div>
      </div>
    );
  }
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
        placeholder={placeholder}
        size={'large'}
        className="rounded-lg shadow"
        disabled={limited}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        suffix={
          <>
            {isReplacing ? (
              <Tooltip title={'Cancel Editing'}>
                <Button
                  onClick={cancelReplace}
                  icon={<X size={16} />}
                  size={'small'}
                  shape={'circle'}
                  disabled={limited}
                />
              </Tooltip>
            ) : null}
            <SendButton
              isLoading={isLoading}
              submit={submit}
              limited={limited}
              isProcessing={isProcessing}
            />
          </>
        }
      />
      <div className="absolute ml-1 top-2 -right-11">
        <Usage />
      </div>
    </div>
  );
}

function SendButton({
  isLoading,
  submit,
  limited,
  isProcessing,
}: {
  isLoading?: boolean;
  submit: () => void;
  limited: boolean;
  isProcessing?: boolean;
}) {
  return (
    <Tooltip title={isProcessing ? 'Cancel processing' : 'Send message'}>
      <Button
        loading={isLoading}
        onClick={submit}
        disabled={limited}
        icon={
          isProcessing ? (
            <X size={16} strokeWidth={2} />
          ) : (
            <div className="bg-[#fff] text-main rounded-full">
              <ArrowUp size={14} strokeWidth={2} />
            </div>
          )
        }
        type={'primary'}
        size={'small'}
        shape={isProcessing ? 'circle' : 'round'}
        iconPosition={'end'}
        className="font-semibold text-[#fff]"
      >
        {isProcessing ? null : 'Ask'}
      </Button>
    </Tooltip>
  );
}

export default observer(ChatInput);
