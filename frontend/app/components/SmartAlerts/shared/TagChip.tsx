import { Chip } from '@/ui/data/Chip';
import React from 'react';

export default function TagChip({ label }: { label: string }) {
  return <Chip kind="tag">{label}</Chip>;
}
