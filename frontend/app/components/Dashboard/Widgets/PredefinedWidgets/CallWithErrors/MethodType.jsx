import { Chip } from '@/ui/data/Chip';
import React from 'react';

function MethodType({ data }) {
  return <Chip kind="tag">{data.method}</Chip>;
}

export default MethodType;
