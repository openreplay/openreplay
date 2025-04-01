import React from 'react'
import { Button, Input } from "antd";
import { SendHorizonal } from "lucide-react";

function ChatInput({ isLoading, onSubmit }: { isLoading?: boolean, onSubmit: (str: string) => void }) {
  const [inputValue, setInputValue] = React.useState<string>('');

  const submit = () => {
    onSubmit(inputValue)
    setInputValue('')
  }
  return (
    <Input
      placeholder={'Ask anything about your product and users...'}
      size={'large'}
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && inputValue) {
          submit()
        }
      }}
      suffix={
        <Button
          loading={isLoading}
          onClick={submit}
          icon={<SendHorizonal size={16} />}
          type={'text'}
          size={'small'}
          shape={'circle'}
        />
      }
    />
  )
}

export default ChatInput
