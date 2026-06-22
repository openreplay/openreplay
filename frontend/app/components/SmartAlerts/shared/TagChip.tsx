import React from 'react';

export default function TagChip({ label }: { label: string }) {
  return (
    <span className="text-sm px-2.5 py-0.5 rounded-md border border-gray-light bg-gray-lightest color-gray-dark whitespace-nowrap">
      {label}
    </span>
  );
}
