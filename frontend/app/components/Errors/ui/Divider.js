import React from 'react'
import cn from 'classnames';
import stl from './divider.module.css';

function Divider({ className, color="gray-light" }) {
	return <div className={ cn(stl.divider, className, `bg-${color}`) }/>
}

Divider.displayName = "Divider";

export default Divider;