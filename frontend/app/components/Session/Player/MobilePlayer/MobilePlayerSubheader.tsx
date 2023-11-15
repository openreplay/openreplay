import React, { useMemo } from 'react';
import { Button } from 'UI';
import QueueControls from 'Components/Session_/QueueControls';
import Bookmark from 'Shared/Bookmark';
import SharePopup from 'Components/shared/SharePopup/SharePopup';
import Issues from 'Components/Session_/Issues/Issues';
import NotePopup from 'Components/Session_/components/NotePopup';
import ItemMenu from 'Components/Session_/components/HeaderMenu';
import { observer } from 'mobx-react-lite';
import AutoplayToggle from 'Shared/AutoplayToggle';
import { connect } from 'react-redux';
import { Tag } from 'antd'

function SubHeader(props: any) {

  const enabledIntegration = useMemo(() => {
    const { integrations } = props;
    if (!integrations || !integrations.size) {
      return false;
    }

    return integrations.some((i: Record<string, any>) => i.token);
  }, [props.integrations]);

  const viewportWidth = window.innerWidth;

  const baseMenuItems = [
    {
      key: 1,
      component: <AutoplayToggle />,
    },
    {
      key: 2,
      component: <Bookmark noMargin sessionId={props.sessionId} />,
    },
  ]
  const menuItems = viewportWidth > 1400 ? baseMenuItems : baseMenuItems.concat({
    key: 3,
    component: <NotePopup />,
  })
  return (
    <>
      <div className="w-full px-4 flex items-center border-b relative">
        <Tag color="error">iOS BETA</Tag>
        <div
          className="ml-auto text-sm flex items-center color-gray-medium gap-2"
          style={{ width: 'max-content' }}
        >
          {viewportWidth > 1400 ? <NotePopup /> : null}
          {enabledIntegration && <Issues sessionId={props.sessionId} />}
          <SharePopup
            entity="sessions"
            id={props.sessionId}
            showCopyLink={true}
            trigger={
              <div className="relative">
                <Button icon="share-alt" variant="text" className="relative">
                  Share
                </Button>
              </div>
            }
          />
          <ItemMenu
            items={menuItems}
          />

          <div>
            {/* @ts-ignore */}
            <QueueControls />
          </div>
        </div>
      </div>
    </>
  );
}

export default connect((state: any) => ({
  siteId: state.getIn(['site', 'siteId']),
  integrations: state.getIn(['issues', 'list']),
  modules: state.getIn(['user', 'account', 'modules']) || [],
}))(observer(SubHeader));
