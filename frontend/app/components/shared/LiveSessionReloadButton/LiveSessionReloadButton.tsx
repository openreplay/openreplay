import React from 'react'
import ReloadButton from '../ReloadButton'
import { connect } from 'react-redux'
import { fetchSessions } from 'Duck/liveSearch'

interface Props {
    loading: boolean
    fetchSessions: typeof fetchSessions
}
function LiveSessionReloadButton(props: Props) {
    const { loading } = props
  return (
    <ReloadButton loading={loading} onClick={() => props.fetchSessions()} className="cursor-pointer" />
  )
}

export default connect(state => ({
    loading: state.getIn([ 'sessions', 'fetchLiveListRequest', 'loading' ]),
}), { fetchSessions })(LiveSessionReloadButton)
