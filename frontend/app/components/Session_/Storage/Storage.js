import React from 'react';
import { connect } from 'react-redux';
import { hideHint } from 'Duck/components/player';
import {
	connectPlayer,
	selectStorageType,
	STORAGE_TYPES,
	selectStorageListNow,
	selectStorageList,
} from 'Player/store';
import { JSONTree, NoContent } from 'UI';
import { formatMs } from 'App/date';

import { jump } from 'Player';
import Autoscroll from '../Autoscroll';
import BottomBlock from '../BottomBlock/index';

import stl from './storage.module.css';

// const STATE = 'STATE';
// const DIFF = 'DIFF';
// const TABS = [ DIFF, STATE ].map(tab => ({ text: tab, key: tab }));

function getActionsName(type) {
	switch(type) {
		case STORAGE_TYPES.MOBX:
			return "MUTATIONS";
		case STORAGE_TYPES.VUEX:
			return "MUTATIONS";
		default:
			return "ACTIONS";
	}
}

@connectPlayer(state => ({
	type: selectStorageType(state),
	list: selectStorageList(state),
	listNow: selectStorageListNow(state),
}))
@connect(state => ({
	hintIsHidden: state.getIn(['components', 'player', 'hiddenHints', 'storage']),
}), {
	hideHint
})
//@withEnumToggle('activeTab', 'setActiveTab', DIFF)
export default class Storage extends React.PureComponent {
	lastBtnRef = React.createRef()

	focusNextButton() {
		if (this.lastBtnRef.current) {
			this.lastBtnRef.current.focus();
		}
	}

	componentDidMount() {
		this.focusNextButton();
	}

	componentDidUpdate(prevProps) {
		if (prevProps.listNow.length !== this.props.listNow.length) {
			this.focusNextButton();
		}
	}

	renderDiff() {
		// const { listNow, type } = this.props;
		// const lastRAction = listNow[ listNow.length - 1 ];
		// if (lastRAction.state) {
		// 	const greenPaths = Object.keys(lastRAction.state).map(key => [ key ]);
		// 	return <DiffTree data={ lastRAction.state } greenPaths={ greenPaths } />;
		// }
		// const df = {};
		// const redPaths = [];
		// const yellowPaths = [];
		// const greenPaths = [];
		// lastRAction.diff.forEach(d => {
		// 	try {
	 //  		let { path, kind, rhs: value } = d;
		// 		if (kind === 'A') {
		// 			path.slice().push(d.index);
		// 			kind = d.item.kind;
		// 			value = d.item.rhs;
		// 		}
		// 		setIn(df, path, value);
		// 		if (kind === 'N') greenPaths.push(d.path.slice().reverse());
		// 		if (kind === 'D') redPaths.push(d.path.slice().reverse());
		// 		if (kind === 'E') yellowPaths.push(d.path.slice().reverse());
	 //  	} catch (e) {
	 //  	}
	 //  });
		// return (
		// 	<DiffTree
		// 		data={ df }
		// 		redPaths={ redPaths }
		// 		yellowPaths={ yellowPaths }
		// 		greenPaths={ greenPaths }
		// 	/>
		// );
	}

	ensureString(actionType) {
		if (typeof actionType === 'string') return actionType;
		return "UNKNOWN";
	}

	goNext = () => {
		const { list, listNow } = this.props;
		jump(list[ listNow.length ].time, list[ listNow.length ]._index);
	}


	renderTab () {
		const { listNow } = this.props;
		if (listNow.length === 0) {
			return "Not initialized"; //?
		}
		return  <JSONTree src={ listNow[ listNow.length - 1 ].state  } />;
	}

	renderItem(item, i) {
		const { type, listNow, list } = this.props;
		let src;
		let name;

		// ZUSTAND TODO
		console.log(item, type)
		switch(type) {
			case STORAGE_TYPES.REDUX:
			case STORAGE_TYPES.NGRX:
				src = item.action;
				name = src && src.type;
			break;
			case STORAGE_TYPES.VUEX:
				src = item.mutation;
				name = src && src.type;
			break;
			case STORAGE_TYPES.MOBX:
				src = item.payload;
				name = `@${item.type} ${src && src.type}`;
			break;
			case STORAGE_TYPES.ZUSTAND:
				src = null;
				name = item.mutation.join('')
		}

		return (
			<div className="flex justify-between items-start" key={ `store-${i}` }>
				{src === null ? (
					<div className="font-mono"> {name} </div>
				) : (
					<JSONTree
						name={ this.ensureString(name) }
						src={ src }
						collapsed
						collapseStringsAfterLength={ 7 }
					/>
				)}
				<div className="flex items-center">
					{ i + 1 < listNow.length &&
						<button
							className={ stl.button }
							onClick={ () => jump(item.time, item._index) }
						>
							{"JUMP"}
						</button>
					}
					{ i + 1 === listNow.length && i + 1 < list.length  &&
						<button
							className={ stl.button }
							ref={ this.lastBtnRef }
							onClick={ this.goNext }
						>
							{"NEXT"}
						</button>
					}
					{ typeof item.duration === 'number' &&
						<div className="font-size-12 color-gray-medium">
							{ formatMs(item.duration) }
						</div>
					}
				</div>
			</div>
		);
	}

	render() {
		const {
			type,
			listNow,
			list,
			hintIsHidden,
		} = this.props;

		const showStore = type !== STORAGE_TYPES.MOBX;
		return (
			<BottomBlock>
				<BottomBlock.Header>
					<span className="font-semibold color-gray-medium mr-4">State</span>
					{ list.length > 0 &&
						<div className="flex w-full">
							{ showStore &&
								<h3 style={{ width: "40%" }}>
									{"STORE"}
								</h3>
							}
							<h3 style={{ width: "40%" }}>
								{getActionsName(type)}
							</h3>
						</div>
					}
				</BottomBlock.Header>
				<BottomBlock.Content className="flex" >
					<NoContent
            title="Nothing to display yet."
            subtext={ !hintIsHidden
              ?
                <>
                	{'Inspect your application state while you’re replaying your users sessions. OpenReplay supports '}
                	<a className="underline color-teal" href="https://docs.openreplay.com/plugins/redux" target="_blank">Redux</a>{', '}
                	<a className="underline color-teal" href="https://docs.openreplay.com/plugins/vuex" target="_blank">VueX</a>{', '}
									{/* ZUSTAND TODO */}
                	<a className="underline color-teal" href="https://docs.openreplay.com/plugins/mobx" target="_blank">MobX</a>{' and '}
                	<a className="underline color-teal" href="https://docs.openreplay.com/plugins/ngrx" target="_blank">NgRx</a>.
                	<br/><br/>
                  <button className="color-teal" onClick={() => this.props.hideHint("storage")}>Got It!</button>
                </>
              : null
            }
            size="small"
            show={ listNow.length === 0 }
          >
						{ showStore &&
						  <div className="ph-10 scroll-y" style={{ width: "40%" }} >
								{ listNow.length === 0
									? <div className="color-gray-light font-size-16 mt-20 text-center" >{ "Empty state." }</div>
									: this.renderTab()
								}
							</div>
						}
						<div className="flex" style={{ width: showStore ? "60%" : "100%" }} >
							<Autoscroll className="ph-10" >
								{ listNow.map((item, i) => this.renderItem(item, i)) }
							</Autoscroll>
						</div>
					</NoContent>
				</BottomBlock.Content>
			</BottomBlock>
		);
	}
}
