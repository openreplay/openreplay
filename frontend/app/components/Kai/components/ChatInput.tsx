import React from 'react'
import { Button, Input } from "antd";
import { SendHorizonal, OctagonX } from "lucide-react";
import { kaiStore } from "../KaiStore";
import { observer } from "mobx-react-lite";

function ChatInput({ isLoading, onSubmit, threadId }: { isLoading?: boolean, onSubmit: (str: string) => void, threadId: string }) {
  const inputRef = React.useRef<Input>(null);
  const inputValue = kaiStore.queryText;
  const isProcessing = kaiStore.processingStage !== null
  const setInputValue = (text: string) => {
    kaiStore.setQueryText(text)
  }

  const submit = () => {
    if (isProcessing) {
      const settings = { projectId: '2325', userId: '0', threadId, };
      void kaiStore.cancelGeneration(settings)
    } else {
      if (inputValue.length > 0) {
        onSubmit(inputValue)
        setInputValue('')
      }
    }
  }

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [inputValue])

  return (
    <Input
      onPressEnter={submit}
      ref={inputRef}
      placeholder={'Ask anything about your product and users...'}
      size={'large'}
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      suffix={
        <Button
          loading={isLoading}
          onClick={submit}
          icon={isProcessing ? <OctagonX size={16} /> : <SendHorizonal size={16} />}
          type={'text'}
          size={'small'}
          shape={'circle'}
        />
      }
    />
  )
}

export default observer(ChatInput)
