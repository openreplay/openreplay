import React, { useEffect } from 'react';
import { Button, TagBadge } from 'UI';
import { connect } from 'react-redux';
import { fetchList, save, remove } from 'Duck/customField';
import CustomFieldForm from '../../../Client/CustomFields/CustomFieldForm';
import { confirm } from 'UI';
import { useModal } from 'App/components/Modal';
import { toast } from 'react-toastify';

const MetadataList = (props) => {
  const { site, fields } = props;

  const { showModal, hideModal } = useModal();

  useEffect(() => {
    props.fetchList(site.id);
  }, []);

  const save = (field) => {
    props.save(site.id, field).then((response) => {
      if (!response || !response.errors || response.errors.size === 0) {
        hideModal();
        toast.success('Metadata added successfully!');
      } else {
        toast.error(response.errors[0]);
      }
    });
  };

  const openModal = () => {
    showModal(<CustomFieldForm onClose={hideModal} onSave={save} />, { right: true });
  };

  const removeMetadata = async (field) => {
    if (
      await confirm({
        header: 'Metadata',
        confirmation: `Are you sure you want to remove?`,
      })
    ) {
      props.remove(site.id, field.index);
    }
  };

  return (
    <div className="py-2 flex">
      <Button variant="outline" onClick={() => openModal(true)}>
        Add Metadata
      </Button>
      <div className="flex ml-2">
        {fields.map((f, index) => (
          <TagBadge key={index} text={f.key} onRemove={() => removeMetadata(f)} outline />
        ))}
      </div>
    </div>
  );
};

export default connect(
  (state) => ({
    site: state.getIn(['site', 'instance']),
    fields: state.getIn(['customFields', 'list']).sortBy((i) => i.index),
    field: state.getIn(['customFields', 'instance']),
    loading: state.getIn(['customFields', 'fetchRequest', 'loading']),
  }),
  { fetchList, save, remove }
)(MetadataList);
