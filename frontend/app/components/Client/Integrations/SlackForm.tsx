import React, { useEffect } from 'react';
import SlackChannelList from './SlackChannelList/SlackChannelList';
import { fetchList } from 'Duck/integrations/slack';
import { connect } from 'react-redux';
import SlackAddForm from './SlackAddForm';
import { useModal } from 'App/components/Modal';

interface Props {
    onEdit: (integration: any) => void;
    istance: any;
    fetchList: any;
}
const SlackForm = (props: Props) => {
    const { istance } = props;
    const { hideModal } = useModal();
    const [active, setActive] = React.useState(false);

    const onEdit = () => {
        setActive(true);
    };

    useEffect(() => {
        props.fetchList();
    }, []);

    return (
        <div className="bg-white h-screen overflow-y-auto flex items-start" style={{ width: active ? '650px' : '350px' }}>
            <div style={{ width: '350px' }}>
                <h3 className="p-5 text-2xl">Slack</h3>
                <SlackChannelList onEdit={onEdit} />
            </div>
            {active && (
                <div className="border-l h-full">
                    <SlackAddForm onClose={() => setActive(false)} />
                </div>
            )}
        </div>
    );
};

SlackForm.displayName = 'SlackForm';

export default connect(
    (state: any) => ({
        istance: state.getIn(['slack', 'instance']),
    }),
    { fetchList }
)(SlackForm);
