import React from 'react'
// import { fetchLiveList } from 'Duck/sessions'
import { connect } from 'react-redux';
import { NoContent } from 'UI';
import { List } from 'immutable';

interface Props {
  loading: Boolean,
  list?: List<any>
}

function LiveSessionList({ loading, list }: Props ) {
  return (
    <div>
      <NoContent
        title={"No live sessions!"}
        subtext="Please try changing your search parameters."
        icon="exclamation-circle"
        show={ !loading && list && list.size === 0}
      >

      </NoContent>
    </div>
  )
}

export default connect(state => ({

}), { })(LiveSessionList)
