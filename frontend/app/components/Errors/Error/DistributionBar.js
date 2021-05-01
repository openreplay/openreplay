import cn from 'classnames';
import { Popup } from 'UI';
import { Styles } from '../../Dashboard/Widgets/common';
import cls from './distributionBar.css';
import { colorScale } from 'App/utils';

function DistributionBar({ className, title, partitions }) {
	if (partitions.length === 0) {
		return null;
	}

	const values = Array(partitions.length).fill().map((element, index) => index + 0);
	const colors = colorScale(values, Styles.colors);

	return (
		<div className={ className } >
			<div className="flex justify-between text-sm mb-1">
				<span className="capitalize">{ title }</span>
				<span>
					<span className="font-thin capitalize">{ partitions[0].label }</span>
					<span className="ml-2">{ `${ Math.round(partitions[0].prc) }% ` }</span>
				</span>
			</div>
			<div className={ cn("border-radius-3 overflow-hidden flex", cls.bar) }>
				{ partitions.map((p, index) => 
					<Popup
						key={p.label}
						inverted
						size="mini"
						trigger={ 
							<div 
								className="h-full bg-tealx" 
								style={{
									marginLeft: '1px',
									width: `${ p.prc }%`,									
									backgroundColor: colors(index)
								}} 
							/>
						}
						content={
							<div className="text-center">
								<span className="capitalize">{ p.label }</span><br/>
								{`${ Math.round(p.prc) }%`}
							</div>
						}
					/>
				)}
			</div>
		</div>
	);
}

DistributionBar.displayName = "DistributionBar";
export default DistributionBar;