import React from 'react';
import { connect } from 'react-redux';
import { Button, Divider, Dropdown, Menu, Space, Typography } from 'antd';
import { CaretDownOutlined, FolderAddOutlined, FolderOutlined } from '@ant-design/icons';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { hasSiteId, siteChangeAvailable } from 'App/routes';
import { setSiteId } from 'Duck/site';
import { fetchListActive as fetchMetadata } from 'Duck/customField';
import { clearSearch } from 'Duck/search';
import { clearSearch as clearSearchLive } from 'Duck/liveSearch';
import { useModal } from 'Components/Modal';
import { init as initProject } from 'Duck/site';
import NewSiteForm from 'Components/Client/Sites/NewSiteForm';
import { withStore } from 'App/mstore';
import { Icon } from 'UI'
import cn from 'classnames'

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
  const showCurrent = hasSiteId(location.pathname) || siteChangeAvailable(location.pathname);
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

  const menu = (
    <Menu>
      {isAdmin && (
        <>
          <Menu.Item icon={<FolderAddOutlined rev={undefined} />} key='all-projects' onClick={addProjectClickHandler}>
            <Text>Add Project</Text>
          </Menu.Item>
          <Divider style={{ margin: 0 }} />
        </>
      )}

      {sites.map((site) => (
        <Menu.Item
          icon={<Icon name={site.platform === 'web' ? 'browser/browser' : 'mobile'} color={activeSite?.host === site.host ? 'main' : undefined} />}
          key={site.id}
          onClick={() => handleSiteChange(site.id)}
          className={cn('!py-2', activeSite?.host === site.host ? 'bg-active-blue' : '')}
        >
          <Text className={cn('capitalize', activeSite?.host === site.host ? 'text-main' : '')}>{site.host}</Text>
        </Menu.Item>
      ))}
    </Menu>
  );

  return (
    <Dropdown overlay={menu} placement='bottomLeft'>
      <Button>
        <Space>
          <Text className='font-medium capitalize'>{showCurrent && activeSite ? (
            <div className='flex items-center gap-2'>
              <Icon name={activeSite?.platform === 'web' ? 'browser/browser' : 'mobile'} />
              {activeSite.host}
            </div>
          ) : 'All Projects'}</Text>
          <CaretDownOutlined rev={undefined} />
        </Space>
      </Button>
    </Dropdown>
  );
}

const mapStateToProps = (state: any) => ({
  sites: state.getIn(['site', 'list']),
  siteId: state.getIn(['site', 'siteId']),
  account: state.getIn(['user', 'account'])
});

export default withRouter(
  connect(mapStateToProps, {
    setSiteId,
    fetchMetadata,
    clearSearch,
    clearSearchLive,
    initProject
  })(withStore(ProjectDropdown))
);
