import React from 'react';

interface Props {
  classNam?: string;
  [x: string]: any;
}
export default (props: Props) => {
  const { className = '', ...rest } = props;
  return (
    <input
      type="checkbox" 
      className={className}
      { ...rest }
    />
  )
};