import React from 'react';
import { BarChart, Bar, YAxis, Tooltip, XAxis } from 'recharts';
import cn from 'classnames';
import moment from 'moment';
import { diffFromNowString } from 'App/date';
import { error as errorRoute } from 'App/routes';
import { IGNORED, RESOLVED } from 'Types/errorInfo';
import { Checkbox, Link } from 'UI';
import ErrorName from 'Components/Errors/ui/ErrorName';
import Label from 'Components/Errors/ui/Label';
import stl from './listItem.module.css';
import { Styles } from '../../../Dashboard/Widgets/common';

const CustomTooltip = ({ active, payload, label }) => {
  if (active) {
	const p = payload[0].payload;
    return (
      <div className="rounded border bg-white p-2">
        <p className="label text-sm color-gray-medium">{`${moment(p.timestamp).format('l')}`}</p>
        <p className="text-sm">Sessions: {p.count}</p>
      </div>
    );
  }

  return null;
};

function ListItem({ className, onCheck, checked, error, disabled }) {
	
	const getDateFormat = val => {
		const d = new Date(val);
		return  (d.getMonth()+ 1) + '/' + d.getDate()
	}

	return (
		<div className={ cn("flex justify-between cursor-pointer py-4", className) } id="error-item">
			<Checkbox 
				disabled={disabled}
				checked={ checked }
				onChange={ () => onCheck(error) }
			/>

			<div className={ cn("ml-3 flex-1 leading-tight", stl.name) } >
				<Link to={errorRoute(error.errorId)} >
					<ErrorName
						icon={error.status === IGNORED ? 'ban' : null }
						lineThrough={error.status === RESOLVED}
						name={ error.name }
						message={ error.stack0InfoString }
						bold={ !error.viewed }
					/>
				<div 
					className={ cn("truncate color-gray-medium", { "line-through" : error.status === RESOLVED}) }
				>
					{ error.message }
				</div>
				</Link>
			</div>
			<BarChart width={ 150 } height={ 40 } data={ error.chart }>
				<XAxis hide dataKey="timestamp"  />
				<YAxis hide domain={[0, 'dataMax + 8']} />
				<Tooltip {...Styles.tooltip} label="Sessions" content={<CustomTooltip />} />
		    <Bar name="Sessions" minPointSize={1} dataKey="count" fill="#A8E0DA" />							
		  </BarChart>
			<Label 
				className={stl.sessions}
				topValue={ error.sessions }
				bottomValue="Sessions"
			/>
			<Label
				className={stl.users}
				topValue={ error.users }
				bottomValue="Users"
			/>
			<Label
				className={stl.occurrence}
				topValue={ `${diffFromNowString(error.lastOccurrence)} ago` }
				bottomValue="Last Seen"
			/>
		</div>
	);
}


ListItem.displayName = "ListItem";
export default ListItem;