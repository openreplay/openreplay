import { useState, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { LOGS } from 'Player/ios/state';
import { getRE } from 'App/utils';
import { Tabs, Input, NoContent } from 'UI';
import * as PanelLayout from '../Layout/ToolPanel/PanelLayout';
import Log from '../Layout/ToolPanel/Log';

import Autoscroll from 'Components/Session_/Autoscroll';


const ALL = 'ALL';
const INFO = 'info';
const ERROR = 'error';

const TABS = [ ALL, INFO, ERROR ].map(tab => ({ text: tab.toUpperCase(), key: tab }));

function Logs({ player }) {
	const [ filter, setFilter ] = useState("");
	const [ activeTab, setTab ] = useState(ALL);
	const onInputChange = useCallback(({ target }) => setFilter(target.value));
	const filterRE = getRE(filter, 'i');
  const filtered = player.lists[LOGS].listNow.filter(({ severity, content }) => 
  	(activeTab === ALL || activeTab === severity) && filterRE.test(content)
  );
	return (
		<>
			<PanelLayout.Header>
				<Tabs 
	        tabs={ TABS }
	        active={ activeTab }
	        onClick={ setTab }
	        border={ false }
	      />
	      <Input
	        className="input-small"
	        placeholder="Filter"
	        icon="search"
	        iconPosition="left"
	        name="filter"
	        onChange={ onInputChange }
	      />
	    </PanelLayout.Header>
      <PanelLayout.Body>
	      <NoContent
	        size="small"
	        show={ filtered.length === 0 }
					title="No recordings found"
	      >
					<Autoscroll>
						{	filtered.map(log => 
							<Log text={log.content} level={log.severity}/>	
						)}
					</Autoscroll>
				</NoContent>
			</PanelLayout.Body>
		</>
	);
}

export default observer(Logs);
