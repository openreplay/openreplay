import React from 'react'
import { connect } from 'react-redux'
import { TextEllipsis, NoContent } from 'UI';
import { remove, edit } from 'Duck/integrations/slack'

function SlackChannelList(props) {
  const { list } = props;

  const onEdit = (instance) => {
    props.edit(instance)
    props.onEdit()
  }

  return (
    <div className="mt-6">
      <NoContent
        title="No data available."
        size="small"
        show={ list.size === 0 }
      >
        {list.map(c => (
          <div
            key={c.webhookId}
            className="border-t px-5 py-2 flex items-center justify-between cursor-pointer"
            onClick={() => onEdit(c)}
          >
            <div className="flex-grow-0" style={{ maxWidth: '90%'}}>
              <div>{c.name}</div>
              <div className="truncate test-xs color-gray-medium">
                {c.endpoint}
              </div>
            </div>
            {/* <div className="flex-shrink-0">
              <Button plain onClick={() => remove(c.webhookId) }>
                <Icon name="trash"/>
              </Button>
            </div> */}
          </div>
        ))}
      </NoContent>
    </div>
  )
}

export default connect(state => ({
  list: state.getIn(['slack', 'list'])
}), { remove, edit })(SlackChannelList)
