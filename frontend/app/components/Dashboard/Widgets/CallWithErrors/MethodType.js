import React from 'react'
import { Label } from 'UI';

const MethodType = ({ data }) => {
  return (
    <Label className="ml-1">{data.method}</Label>
  )
}

export default MethodType
