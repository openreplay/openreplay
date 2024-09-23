import {
  CaretDownOutlined,
  FolderAddOutlined
} from '@ant-design/icons';
import { Button, Divider, Dropdown, Space, Typography } from 'antd';
import cn from 'classnames';
import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { useStore, withStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { hasSiteId, siteChangeAvailable } from 'App/routes';
import NewSiteForm from 'Components/Client/Sites/NewSiteForm';
import { useModal } from 'Components/Modal';
import { Icon } from 'UI';

const { Text } = Typography;

interface Props extends RouteComponentProps {
  account: any;
}

function ProjectDropdown(props: Props) {
  const mstore = useStore();
  const { customFieldStore, projectsStore, sessionStore, searchStore, searchStoreLive } = mstore;
  const sites = projectsStore.list;
  const siteId = projectsStore.siteId;
  const setSiteId = projectsStore.setSiteId;
  const initProject = projectsStore.initProject;
  const { location, account } = props;
  const isAdmin = account.admin || account.superAdmin;
  const activeSite = sites.find((s) => s.id === siteId);
  const showCurrent =
    hasSiteId(location.pathname) || siteChangeAvailable(location.pathname);
  const { showModal, hideModal } = useModal();

  const handleSiteChange = async (newSiteId: string) => {
    mstore.initClient();
    setSiteId(newSiteId);
    searchStore.clearSearch();
    searchStore.clearList();
    searchStoreLive.clearSearch();

    // await customFieldStore.fetchList(newSiteId);
    // await searchStore.fetchSavedSearchList()
  };

  const addProjectClickHandler = () => {
    initProject({});
    showModal(<NewSiteForm onClose={hideModal} />, { right: true });
  };

  const menuItems = sites.map((site) => ({
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
    )
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
      )
    });
  }

  return (
    <Dropdown
      menu={{
        items: menuItems,
        selectable: true,
        defaultSelectedKeys: [siteId],
        style: {
          maxHeight: 500,
          overflowY: 'auto'
        }
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
  account: state.getIn(['user', 'account'])
});

export default withStore(withRouter(
  connect(mapStateToProps, {})(observer(ProjectDropdown))
));
