import React from 'react'
import { Styles } from '../../common';
import cn from 'classnames';
import stl from './scale.module.css';

function Scale({ colors }) {
  const lastIndex = (Styles.colorsTeal.length - 1)
  
  return (
    <div className={ cn(stl.bars, 'absolute bottom-0 mb-4')}>
      {Styles.colorsTeal.map((c, i) => (
        <div
          key={i}
          style={{ backgroundColor: c, width: '6px', height: '15px', marginBottom: '1px' }}
          className="flex items-center justify-center"
        >
          { i === 0 && <div className="text-xs pl-12">Slow</div>}
          { i === lastIndex && <div className="text-xs pl-12">Fast</div>}
        </div>
      ))}
    </div>
  )
}

export default Scale
