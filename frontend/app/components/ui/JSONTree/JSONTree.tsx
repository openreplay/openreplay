import React from 'react';
import JsonView from 'react18-json-view';

function updateObjectLink(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return [...obj];
  return { ...obj };
}

interface Props {
  src: any;
  className?: string;
  dark?: boolean;
  theme?:
    | 'default'
    | 'a11y'
    | 'github'
    | 'vscode'
    | 'atom'
    | 'winter-is-coming';
  enableClipboard?: boolean;
  matchesURL?: boolean;
  displaySize?: boolean | number | 'collapsed';
  collapseStringsAfterLength?: number;
  collapsed?: number | boolean;
  editable?: boolean;
  onAdd?: (params: {
    indexOrName: string | number;
    depth: number;
    src: any;
    parentType: 'object' | 'array';
  }) => void;
  onDelete?: (params: {
    value: any;
    indexOrName: string | number;
    depth: number;
    src: any;
    parentType: 'object' | 'array';
  }) => void;
  onEdit?: (params: {
    newValue: any;
    oldValue: any;
    depth: number;
    src: any;
    indexOrName: string | number;
    parentType: 'object' | 'array';
  }) => void;
}

function JSONTree(props: Props) {
  return (
    <JsonView
      src={updateObjectLink(props.src)}
      collapsed={1}
      displaySize="collapsed"
      enableClipboard
      {...props}
    />
  );
}

export default JSONTree;
