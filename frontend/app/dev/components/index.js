import React, { useState } from 'react';
import CrashReactAppButton from './CrashReactAppButton';
import EventErrorButton from './EventErrorButton';
import MemoryCrushButton from './MemoryCrushButton';
import PromiseErrorButton from './PromiseErrorButton';
import EvalErrorBtn from './EvalErrorBtn';
import InternalErrorButton from './InternalErrorButton';
import { options } from "../console";

export default function ErrorGenPanel() {
	const [show, setShow] =  useState(false);
	if (window.env.PRODUCTION && !options.enableCrash) return null;
	return (
		<div  style={{ position: 'relative' }}>
			<button style={{ background: 'coral', height: '100%' }} onClick={() => setShow(!show)}>Show buttons</button>
			{ show &&
				<div style={{ position: 'absolute', display:'flex', flexDirection: 'column' }}>
					<CrashReactAppButton/>
					<EventErrorButton/>
					<MemoryCrushButton/>
					<PromiseErrorButton/>
					<EvalErrorBtn/>
					<InternalErrorButton/>
				</div>
			}
		</div>
	);
}