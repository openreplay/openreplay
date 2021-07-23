import React, { useState, useEffect } from 'react';

import { Popup } from 'UI';
import type { MarkedTarget } from 'Player/MessageDistributor/StatedScreen/StatedScreen';

import stl from './Marker.css';

interface Props {
  target: MarkedTarget;
}

export default function Marker({ target }: Props) {
  const style = {
    top: `${ target.boundingRect.top }px`,
    left: `${ target.boundingRect.left }px`,
    width: `${ target.boundingRect.width }px`,
    height: `${ target.boundingRect.height }px`,
  }

  return <div className={ stl.marker }  style={ style } />
}