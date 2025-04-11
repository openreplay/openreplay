import React from 'react'
import {
  Languages, X, Info
} from 'lucide-react'
import { Button } from 'antd';
import { useHistory } from "react-router-dom";
import { client } from 'App/routes'

function LangBanner({ onClose }: { onClose: () => void }) {
  const history = useHistory()

  const onClick = () => {
    history.push(client('account'))
  }
  return (
    <div className={'px-4 py-2 bg-yellow flex items-center w-screen gap-2'}>
      <Info size={16} />
      <div>
        OpenReplay now supports French, Russian, Chinese, and Spanish 🎉. Update your language in settings.
      </div>
      <div className={'ml-auto'} />
      <Button icon={<Languages size={14} />} size={'small'} onClick={onClick}>
        Change Language
      </Button>
      <Button icon={<X size={16} />} type={'text'} shape={'circle'} onClick={onClose} size={'small'} />
    </div>
  )
}

export default LangBanner