import React, { useEffect } from 'react';
import cn from 'classnames';
import { connect } from 'react-redux';
import withPageTitle from 'HOCs/withPageTitle';
import { Button, Loader, NoContent, Icon } from 'UI';
import { init, fetchList, save, remove } from 'Duck/customField';
import SiteDropdown from 'Shared/SiteDropdown';
import styles from './customFields.module.css';
import CustomFieldForm from './CustomFieldForm';
import ListItem from './ListItem';
import { confirm } from 'UI';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { useModal } from 'App/components/Modal';

function CustomFields(props) {
    const [currentSite, setCurrentSite] = React.useState(props.sites.get(0));
    const [deletingItem, setDeletingItem] = React.useState(null);
    const { showModal, hideModal } = useModal();

    useEffect(() => {
        const activeSite = props.sites.get(0);
        if (!activeSite) return;

        props.fetchList(activeSite.id);
    }, []);

    const save = (field) => {
        props.save(currentSite.id, field).then(() => {
            const { errors } = props;
            if (!errors || errors.size === 0) {
                hideModal();
            }
        });
    };

    const init = (field) => {
        props.init(field);
        showModal(<CustomFieldForm onClose={hideModal} onSave={save} onDelete={() => removeMetadata(field)} />);
    };

    const onChangeSelect = ({ value }) => {
        const site = props.sites.find((s) => s.id === value.value);
        setCurrentSite(site);
        props.fetchList(site.id);
    };

    const removeMetadata = async (field) => {
        if (
            await confirm({
                header: 'Metadata',
                confirmation: `Are you sure you want to remove?`,
            })
        ) {
            setDeletingItem(field.index);
            props
                .remove(currentSite.id, field.index)
                .then(() => {
                    hideModal();
                })
                .finally(() => {
                    setDeletingItem(null);
                });
        }
    };

    const { fields, loading } = props;
    return (
        <div>
            <div className={cn(styles.tabHeader, 'px-5 pt-5')}>
                <h3 className={cn(styles.tabTitle, 'text-2xl')}>{'Metadata'}</h3>
                <div style={{ marginRight: '15px' }}>
                    <SiteDropdown value={currentSite && currentSite.id} onChange={onChangeSelect} />
                </div>
                <Button className="ml-auto" variant="primary" onClick={() => init()}>Add</Button>
            </div>
            <div className="text-base text-disabled-text flex px-5 items-center my-3">
                <Icon name="info-circle-fill" className="mr-2" size={16} />
                See additonal user information in sessions.
                <a href="https://docs.openreplay.com/installation/metadata" className="link ml-1" target="_blank">Learn more</a>
            </div>

            <Loader loading={loading}>
                <NoContent
                    title={
                        <div className="flex flex-col items-center justify-center">
                            <AnimatedSVG name={ICONS.NO_METADATA} size={80} />
                            {/* <div className="mt-4" /> */}
                            <div className="text-center text-gray-600 my-4">None added yet</div>
                        </div>
                    }
                    size="small"
                    show={fields.size === 0}
                >
                    <div className={styles.list}>
                        {fields
                            .filter((i) => i.index)
                            .map((field) => (
                                <ListItem
                                    disabled={deletingItem && deletingItem === field.index}
                                    key={field._key}
                                    field={field}
                                    onEdit={init}
                                    // onDelete={ () => removeMetadata(field) }
                                />
                            ))}
                    </div>
                </NoContent>
            </Loader>
        </div>
    );
}

export default connect(
    (state) => ({
        fields: state.getIn(['customFields', 'list']).sortBy((i) => i.index),
        field: state.getIn(['customFields', 'instance']),
        loading: state.getIn(['customFields', 'fetchRequest', 'loading']),
        sites: state.getIn(['site', 'list']),
        errors: state.getIn(['customFields', 'saveRequest', 'errors']),
    }),
    {
        init,
        fetchList,
        save,
        remove,
    }
)(withPageTitle('Metadata - OpenReplay Preferences')(CustomFields));
