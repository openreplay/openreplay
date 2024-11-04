import React from 'react'
import ReloadButton from '../ReloadButton'
import { connect } from 'react-redux'
// import { fetchSessions } from 'Duck/liveSearch'

interface Props {
    loading: boolean
    onClick: () => void
}
function LiveSessionReloadButton(props: Props) {
    const { loading, onClick } = props
  return (
    <ReloadButton loading={loading} onClick={onClick} className="cursor-pointer" />
  )
}

export default connect((state: any) => ({
    loading: state.getIn([ 'sessions', 'fetchLiveListRequest', 'loading' ]),
}))(LiveSessionReloadButton)
