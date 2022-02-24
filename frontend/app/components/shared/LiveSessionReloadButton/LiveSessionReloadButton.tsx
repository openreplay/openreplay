import React from 'react'
import ReloadButton from '../ReloadButton'
import { connect } from 'react-redux'
import { fetchLiveList } from 'Duck/sessions'

interface Props {
    loading: boolean
    fetchLiveList: typeof fetchLiveList
}
function LiveSessionReloadButton(props: Props) {
    const { loading } = props
  return (
    <ReloadButton loading={loading} onClick={props.fetchLiveList} className="cursor-pointer" />
  )
}

export default connect(state => ({
    loading: state.getIn([ 'sessions', 'fetchLiveListRequest', 'loading' ]),
}), { fetchLiveList })(LiveSessionReloadButton)
