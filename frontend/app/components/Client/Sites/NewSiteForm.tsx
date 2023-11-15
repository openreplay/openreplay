import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { connect, ConnectedProps } from 'react-redux';
import { Form, Input, Button, Icon, SegmentSelection } from 'UI';
import { save, edit, update, fetchList, remove } from 'Duck/site';
import { pushNewSite } from 'Duck/user';
import { setSiteId } from 'Duck/site';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import styles from './siteForm.module.css';
import { confirm } from 'UI';
import { clearSearch } from 'Duck/search';
import { clearSearch as clearSearchLive } from 'Duck/liveSearch';
import { withStore } from 'App/mstore';
import { toast } from 'react-toastify';

type OwnProps = {
  onClose: (arg: any) => void;
  mstore: any;
  canDelete: boolean;
};

type PropsFromRedux = ConnectedProps<typeof connector>;

type Props = PropsFromRedux & RouteComponentProps & OwnProps;

const NewSiteForm = ({
  site,
  loading,
  save,
  remove,
  edit,
  update,
  pushNewSite,
  fetchList,
  setSiteId,
  clearSearch,
  clearSearchLive,
  location: { pathname },
  onClose,
  mstore,
  activeSiteId,
  canDelete,
}: Props) => {
  const [existsError, setExistsError] = useState(false);

  useEffect(() => {
    if (pathname.includes('onboarding')) {
      setSiteId(site.id);
    }
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (site.exists()) {
      update(site, site.id).then((response: any) => {
        if (!response || !response.errors || response.errors.size === 0) {
          onClose(null);
          if (!pathname.includes('onboarding')) {
            fetchList();
          }
          toast.success('Project updated successfully');
        } else {
          toast.error(response.errors[0]);
        }
      });
    } else {
      save(site).then((response: any) => {
        if (!response || !response.errors || response.errors.size === 0) {
          onClose(null);
          clearSearch();
          clearSearchLive();
          mstore.initClient();
          toast.success('Project added successfully');
        } else {
          toast.error(response.errors[0]);
        }
      });
    }
  };

  const handleRemove = async () => {
    if (
      await confirm({
        header: 'Projects',
        confirmation: `Are you sure you want to delete this Project? We won't be able to record anymore sessions.`,
      })
    ) {
      remove(site.id).then(() => {
        onClose(null);
        if (site.id === activeSiteId) {
          setSiteId(null);
        }
      });
    }
  };

  const handleEdit = ({ target: { name, value } }: ChangeEvent<HTMLInputElement>) => {
    setExistsError(false);
    edit({ [name]: value });
  };

  return (
    <div className="bg-white h-screen overflow-y-auto" style={{ width: '350px' }}>
      <h3 className="p-5 text-2xl">{site.exists() ? 'Edit Project' : 'New Project'}</h3>
      <Form className={styles.formWrapper} onSubmit={site.validate() && onSubmit}>
        <div className={styles.content}>
          <Form.Field>
            <label>{'Name'}</label>
            <Input
              placeholder="Ex. openreplay"
              name="name"
              maxLength={40}
              value={site.name}
              onChange={handleEdit}
              className={styles.input}
            />
          </Form.Field>
          <Form.Field>
            <label>Project Type</label>
            <SegmentSelection
              name={"platform"}
              value={{ name: site.platform, value: site.platform }}
              list={[
                { name: 'Web', value: 'web' },
                { name: 'iOS', value: 'ios' },
              ]}
              onSelect={(_, { value }) => {
                edit({ platform: value });
              }}
            />
          </Form.Field>
          <div className="mt-6 flex justify-between">
            <Button
              variant="primary"
              type="submit"
              className="float-left mr-2"
              loading={loading}
              disabled={!site.validate()}
            >
              {site.exists() ? 'Update' : 'Add'}
            </Button>
            {site.exists() && (
              <Button variant="text" type="button" onClick={handleRemove} disabled={!canDelete}>
                <Icon name="trash" size="16" />
              </Button>
            )}
          </div>
          {existsError && <div className={styles.errorMessage}>{'Project exists already.'}</div>}
        </div>
      </Form>
    </div>
  );
};

const mapStateToProps = (state: any) => ({
  activeSiteId: state.getIn(['site', 'active', 'id']),
  site: state.getIn(['site', 'instance']),
  siteList: state.getIn(['site', 'list']),
  loading: state.getIn(['site', 'save', 'loading']) || state.getIn(['site', 'remove', 'loading']),
  canDelete: state.getIn(['site', 'list']).size > 1,
});

const connector = connect(mapStateToProps, {
  save,
  remove,
  edit,
  update,
  pushNewSite,
  fetchList,
  setSiteId,
  clearSearch,
  clearSearchLive,
});

export default connector(withRouter(withStore(NewSiteForm)));
