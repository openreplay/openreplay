import React from 'react';
import { Icon } from 'UI';
import cn from 'classnames';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import { useModal } from 'App/components/Modal';
import NewSiteForm from 'App/components/Client/Sites/NewSiteForm';
import { init } from 'Duck/site';
import { connect } from 'react-redux';
interface Props {
    isAdmin?: boolean;
    init?: (data: any) => void;
}
function NewProjectButton(props: Props) {
    const { isAdmin = false } = props;
    const { userStore } = useStore();
    const limtis = useObserver(() => userStore.limits);
    const canAddProject = useObserver(() => isAdmin && (limtis.projects === -1 || limtis.projects > 0));
    const { showModal, hideModal } = useModal();

    const onClick = () => {
        props.init({});
        showModal(<NewSiteForm onClose={hideModal} />, { right: true });
    };

    return (
        <div
            className={cn('flex items-center justify-center py-3 cursor-pointer hover:bg-active-blue ', { disabled: !canAddProject })}
            onClick={onClick}
        >
            <Icon name="plus" size={12} className="mr-2" color="teal" />
            <span className="color-teal">Add New Project</span>
        </div>
    );
}

export default connect(null, { init })(NewProjectButton);
