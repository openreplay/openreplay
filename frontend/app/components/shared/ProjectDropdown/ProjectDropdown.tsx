import {
  CaretDownOutlined,
  FolderAddOutlined,
} from '@ant-design/icons';
import { Button, Divider, Dropdown, Space, Typography } from 'antd';
import cn from 'classnames';
import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import { withStore } from 'App/mstore';
import { hasSiteId, siteChangeAvailable } from 'App/routes';
import NewSiteForm from 'Components/Client/Sites/NewSiteForm';
import { useModal } from 'Components/Modal';
import { fetchListActive as fetchMetadata } from 'Duck/customField';
import { clearSearch as clearSearchLive } from 'Duck/liveSearch';
import { clearSearch } from 'Duck/search';
import { setSiteId } from 'Duck/site';
import { init as initProject } from 'Duck/site';
import { Icon } from 'UI';

const { Text } = Typography;

interface Site {
  id: string;
  host: string;
  platform: 'web' | 'mobile';
}

interface Props extends RouteComponentProps {
  sites: Site[];
  siteId: string;
  setSiteId: (siteId: string) => void;
  fetchMetadata: () => void;
  clearSearch: (isSession: boolean) => void;
  clearSearchLive: () => void;
  initProject: (data: any) => void;
  mstore: any;
  account: any;
}

function ProjectDropdown(props: Props) {
  const { sites, siteId, location, account } = props;
  const isAdmin = account.admin || account.superAdmin;
  const activeSite = sites.find((s) => s.id === siteId);
  const showCurrent =
    hasSiteId(location.pathname) || siteChangeAvailable(location.pathname);
  const { showModal, hideModal } = useModal();

  const handleSiteChange = (newSiteId: string) => {
    props.setSiteId(newSiteId); // Fixed: should set the new siteId, not the existing one
    props.fetchMetadata();
    props.clearSearch(location.pathname.includes('/sessions'));
    props.clearSearchLive();

    props.mstore.initClient();
  };

  const addProjectClickHandler = () => {
    props.initProject({});
    showModal(<NewSiteForm onClose={hideModal} />, { right: true });
  };

  // @ts-ignore immutable
  const menuItems = sites.toJS().map((site) => ({
    key: site.id,
    label: (
      <div
        key={site.id}
        onClick={() => handleSiteChange(site.id)}
        className={'!py-1 flex items-center gap-2'}
      >
        <Icon
          name={site.platform === 'web' ? 'browser/browser' : 'mobile'}
          color={activeSite?.host === site.host ? 'main' : undefined}
        />
        <Text
          className={cn(
            'capitalize',
            activeSite?.host === site.host ? 'text-main' : ''
          )}
        >
          {site.host}
        </Text>
      </div>
    ),
  }));
  if (isAdmin) {
    menuItems.unshift({
      key: 'add-proj',
      label: (
        <>
          <div
            key="all-projects"
            onClick={addProjectClickHandler}
            className={'flex items-center gap-2'}
          >
            <FolderAddOutlined rev={undefined} />
            <Text>Add Project</Text>
          </div>
          <Divider style={{ marginTop: 4, marginBottom: 0 }} />
        </>
      ),
    });
  }

  return (
    <Dropdown
      open
      menu={{
        items: menuItems,
        selectable: true,
        defaultSelectedKeys: [siteId],
        style: {
          maxHeight: 500,
          overflowY: 'auto',
        },
      }}
      placement="bottomLeft"
    >
      <Button>
        <Space>
          <Text className="font-medium capitalize">
            {showCurrent && activeSite ? (
              <div className="flex items-center gap-2">
                <Icon
                  name={
                    activeSite?.platform === 'web'
                      ? 'browser/browser'
                      : 'mobile'
                  }
                />
                {activeSite.host}
              </div>
            ) : (
              'All Projects'
            )}
          </Text>
          <CaretDownOutlined rev={undefined} />
        </Space>
      </Button>
    </Dropdown>
  );
}

const mapStateToProps = (state: any) => ({
  sites: state.getIn(['site', 'list']),
  siteId: state.getIn(['site', 'siteId']),
  account: state.getIn(['user', 'account']),
});

export default withRouter(
  connect(mapStateToProps, {
    setSiteId,
    fetchMetadata,
    clearSearch,
    clearSearchLive,
    initProject,
  })(withStore(ProjectDropdown))
);
