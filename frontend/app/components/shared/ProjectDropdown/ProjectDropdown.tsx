import { CaretDownOutlined, FolderAddOutlined } from '@ant-design/icons';
import { Button, Dropdown, MenuProps, Space, Typography } from 'antd';
import cn from 'classnames';
import React from 'react';
import { withRouter } from 'react-router-dom';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { hasSiteId, siteChangeAvailable } from 'App/routes';
import { Icon } from 'UI';
import { useModal } from 'Components/ModalContext';
import ProjectForm from 'Components/Client/Projects/ProjectForm';
import Project from '@/mstore/types/project';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

function ProjectDropdown(props: { location: any }) {
  const mstore = useStore();
  const { t } = useTranslation();
  const { projectsStore, searchStore, searchStoreLive, userStore } = mstore;
  const { account } = userStore;
  const sites = projectsStore.list;
  const { siteId } = projectsStore;
  const { setSiteId } = projectsStore;
  const { initProject } = projectsStore;
  const { location } = props;
  const isAdmin = account.admin || account.superAdmin;
  const activeSite = sites.find((s) => s.id === siteId);
  const showCurrent =
    hasSiteId(location.pathname) || siteChangeAvailable(location.pathname);
  const { openModal, closeModal } = useModal();

  const handleSiteChange = async (newSiteId: string) => {
    mstore.initClient();
    setSiteId(newSiteId);
    searchStore.clearSearch();
    searchStore.clearList();
    searchStoreLive.clearSearch();

    // await customFieldStore.fetchList(newSiteId);
    // await searchStore.fetchSavedSearchList()
  };

  const onClose = (pro: Project) => {
    console.log('onClose', pro);
    closeModal();
    if (pro.projectId) {
      void handleSiteChange(pro.projectId.toString());
    }
  };

  const addProjectClickHandler = () => {
    initProject({});
    openModal(<ProjectForm onClose={onClose} />, { title: 'New Project' });
  };

  const menuItems: MenuProps['items'] = sites.map((site) => ({
    key: site.id,
    label: (
      <div key={site.id} className="!py-1 flex items-center gap-2">
        <Icon
          name={site.platform === 'web' ? 'browser/browser' : 'mobile'}
          color={activeSite?.host === site.host ? 'main' : undefined}
        />
        <Text
          className={cn(
            'capitalize',
            activeSite?.host === site.host ? 'text-main' : '',
          )}
        >
          {site.host}
        </Text>
      </div>
    ),
  }));
  if (isAdmin) {
    menuItems?.unshift(
      {
        key: 'add-proj',
        label: (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <FolderAddOutlined rev={undefined} />
            <Text>{t('Add Project')}</Text>
          </div>
        ),
      },
      {
        type: 'divider',
      },
    );
  }

  return (
    <Dropdown
      menu={{
        items: menuItems,
        selectable: true,
        defaultSelectedKeys: [siteId],
        style: {
          maxHeight: 500,
          overflowY: 'auto',
        },
        onClick: (e) => {
          if (e.key === 'add-proj') {
            addProjectClickHandler();
          } else {
            void handleSiteChange(e.key);
          }
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
              t('All Projects')
            )}
          </Text>
          <CaretDownOutlined rev={undefined} />
        </Space>
      </Button>
    </Dropdown>
  );
}

export default withRouter(observer(ProjectDropdown));
