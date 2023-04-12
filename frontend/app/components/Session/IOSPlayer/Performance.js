import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import { PERFORMANCE }  from 'Player/ios/state';

import * as PanelLayout from '../Layout/ToolPanel/PanelLayout';
import Performance from '../Layout/ToolPanel/Performance';


function Info({ name='', value='', show, className }) {
	if (!show) return null;
	return (
		<div className={cn("mr-3", className)}>
			<span>{name}</span>
			<b >{value}</b>
		</div>
	);
}


export default observer(({ player }) => {
	const current = player.lists[PERFORMANCE].current;
	return (
		<>
			<PanelLayout.Header>
				<Info
					name="Thermal State"
					value={current && current.thermalState}
					show={current && ["serious", "critical"].includes(current.thermalState)}
					className={current && current.thermalState==="critical" ? "color-red" : "color-orange"}
				/>
				<Info
					name={current && current.activeProcessorCount}
					value="Active Processors"
					show={current && current.activeProcessorCount != null}
				/>
				<Info
					value="LOW POWER MODE"
					show={current && current.isLowPowerModeEnabled}
					className="color-red"
				/>
				
	    </PanelLayout.Header>
	    <PanelLayout.Body>
	      <Performance 
					performanceChartTime={ current ? current.tmie : 0 }
				  performanceChartData={ player.lists[PERFORMANCE].list }
				  availability={ player.lists[PERFORMANCE].availability }
				  hiddenScreenMarker={ false }
				  player={ player }
				/>
			</PanelLayout.Body>
		</>
	);
})