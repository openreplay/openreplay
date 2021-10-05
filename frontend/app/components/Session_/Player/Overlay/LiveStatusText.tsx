import React from 'react';
import stl from './LiveStatusText.css';
import ovStl from './overlay.css';

interface Props {
  text: string;
}

export default function LiveStatusText({ text }: Props) {
  return <div className={ovStl.overlay}><div className={stl.text}>{text}</div></div>
}