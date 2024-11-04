import React from 'react';
import { connect } from 'react-redux';
import cn from 'classnames';
import withRequest from 'HOCs/withRequest';
import { Loader } from 'UI';
import { countries } from 'App/constants';
import Trend from './Trend';
import DateAgo from './DateAgo';
import DistributionBar from './DistributionBar';

const MAX_PERCENTAGE = 3;
const MIN_COUNT = 4;
const MAX_COUNT = 10;
function hidePredicate(percentage, index) {
	if (index < MIN_COUNT) return false;
	if (index < MAX_COUNT && percentage < MAX_PERCENTAGE) return false;
	return true;
}
function partitionsWrapper(partitions = [], mapCountry = false) {
  const counts = partitions.map(({ count }) => count);
  const sum = counts.reduce((a,b)=>parseInt(a)+parseInt(b),0);
  if (sum === 0) {
  	return [];
  }
  const otherPrcs = counts
  	.map(c => c/sum * 100)
  	.filter(hidePredicate);
  const otherPrcsSum = otherPrcs.reduce((a,b)=>a+b,0);
	const showLength = partitions.length - otherPrcs.length;
	const show = partitions
		.sort((a, b) => b.count - a.count)
		.slice(0, showLength)
  	.map(p => ({
  		label: mapCountry
  			? (countries[p.name] || "Unknown")
  			: p.name,
  		prc: p.count/sum * 100,
		}))

  if (otherPrcsSum > 0) {
    show.push({
      label: "Other",
      prc: otherPrcsSum,
      other: true,
    })
  }
  return show;
}
function tagsWrapper(tags = []) {
	return tags.map(({ name, partitions }) => ({
		name,
		partitions: partitionsWrapper(partitions, name === "country")
	}))
}

function dataWrapper(data = {}) {
	return {
		chart24: data.chart24 || [],
		chart30: data.chart30 || [],
		tags: tagsWrapper(data.tags),
	};
}

@connect(state => ({
	error: state.getIn([ "errors", "instance" ])
}))
@withRequest({
	initialData: props => dataWrapper(props.error),
  endpoint: props => `/errors/${ props.error.errorId }/stats`,
  dataWrapper,
})
export default class SideSection extends React.PureComponent {
	onDateChange = ({ startDate, endDate }) => {
		this.props.request({ startDate, endDate });
	}

	render() {
		const {
			className,
			error,
			data,
			loading,
		} = this.props;

		return (
			<div className={ cn(className, "pl-5") }>
					<h3 className="text-xl mb-2">Overview</h3>
					<Trend
						chart={ data.chart24 }
						title="Past 24 hours"
					/>
					<div className="mb-6" />
					<Trend
						chart={ data.chart30 }
						title="Last 30 days"
						timeFormat={'l'}
					/>
					<div className="mb-6" />
					<DateAgo
						className="my-4"
						title="First Seen"
						timestamp={ error.firstOccurrence }
					/>
					<DateAgo
						className="my-4"
						title="Last Seen"
						timestamp={ error.lastOccurrence }
					/>
					{ data.tags.length > 0 && <h4 className="text-xl mt-6 mb-3">Summary</h4> }
					<Loader loading={loading}>
						{ data.tags.map(({ name, partitions }) =>
							<DistributionBar
								key={ name }
								title={name}
								partitions={partitions}
								className="mb-6"
							/>
						)}
					</Loader>
			</div>
		);
	}
}
