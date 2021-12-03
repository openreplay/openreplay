import React, { useState, useEffect } from 'react'
import { Button, SlideModal, TagBadge } from 'UI'
import { connect } from 'react-redux'
import { init, fetchList, save, remove } from 'Duck/customField';
import CustomFieldForm from '../../../Client/CustomFields/CustomFieldForm';
import { confirm } from 'UI/Confirmation';

const MetadataList = (props) => {
  const { site, fields } = props;
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    props.fetchList(site.id);
  }, [])

  const save = (field) => {
    props.save(site.id, field).then(() => {
      setShowModal(false)
    });
  };
  
  const openModal = () => {
    setShowModal(!showModal);
  }

  const removeMetadata = async (field) => {
    if (await confirm({
      header: 'Metadata',
      confirmation: `Are you sure you want to remove?`
    })) {
      props.remove(site.id, field.index);
    }
  }

  return (
    <div className="py-2 flex">
      <Button primary outline size="small" onClick={() => openModal(true)}>Add Metadata</Button>
      <div className="flex ml-2">
        { fields.map((f, index) => (
          <TagBadge
            key={index}
            text={ f.key }
            onRemove={ () => removeMetadata(f) }
            outline
          />
          // <div>{f.key}</div>
        ))}
      </div>

      <SlideModal
        // title={ `${ (field.exists() ? 'Update' : 'Add') + ' Metadata Field' }` }
        title={ `Metadata Field` }
        size="small"
        isDisplayed={ showModal }
        content={ showModal && (
          <CustomFieldForm onClose={ () => setShowModal(false) } onSave={save} />
        )}
        onClose={ () => setShowModal(false) }
      />
    </div>
  )
}

export default connect(state => ({
  site: state.getIn([ 'site', 'instance' ]),
  fields: state.getIn(['customFields', 'list']).sortBy(i => i.index),
  field: state.getIn(['customFields', 'instance']),
  loading: state.getIn(['customFields', 'fetchRequest', 'loading']),
}), { fetchList, save, remove })(MetadataList)