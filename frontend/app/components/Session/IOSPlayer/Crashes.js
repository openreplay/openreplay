import { useState } from 'react';
import { observer } from "mobx-react-lite";
import { Input, NoContent } from 'UI';
import { getRE } from 'App/utils';
import { CRASHES } from 'Player/ios/state';

import * as PanelLayout from '../Layout/ToolPanel/PanelLayout';

import Autoscroll from 'Components/Session_/Autoscroll';


function Crashes({ player }) {

	const [ filter, setFilter ] = useState("");
	const filterRE = getRE(filter, 'i');
  const filtered = player.lists[CRASHES].listNow.filter(({ name, reason, stacktrace }) => 
  	filterRE.test(name) || filterRE.test(reason) || filterRE.test(stacktrace)
  );
	return (
		<>
			<PanelLayout.Header>
				<Input
	        className="input-small"
	        placeholder="Filter"
	        icon="search"
	        iconPosition="left"
	        name="filter"
	        onChange={ setFilter }
	      />
			</PanelLayout.Header>
			<PanelLayout.Body>
				<NoContent
		      size="small"
					title="No recordings found"
		      show={ filtered.length === 0}
		    >
		      <Autoscroll>
		        { filtered.map(c => (
		          <div className="border-b border-gray-light-shade error p-2">
		          	<h4>{ c.name }</h4>
		          	<h5><i>{`Reason: "${c.reason}"`}</i></h5>
		          	<div className="whitespace-pre  pl-5">{ c.stacktrace }</div>
		          </div>
		        ))}
		      </Autoscroll>
		    </NoContent>
		  </PanelLayout.Body>
	  </>
	);
}

export default observer(Crashes);
