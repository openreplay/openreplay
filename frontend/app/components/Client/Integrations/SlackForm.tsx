import React, { useEffect } from 'react';
import SlackChannelList from './SlackChannelList/SlackChannelList';
import { fetchList, init } from 'Duck/integrations/slack';
import { connect } from 'react-redux';
import SlackAddForm from './SlackAddForm';
import { useModal } from 'App/components/Modal';
import { Button } from 'UI';

interface Props {
    onEdit?: (integration: any) => void;
    istance: any;
    fetchList: any;
    init: any;
}
const SlackForm = (props: Props) => {
    const [active, setActive] = React.useState(false);

    const onEdit = () => {
        setActive(true);
    };

    const onNew = () => {
        setActive(true);
        props.init({});
    }

    useEffect(() => {
        props.fetchList();
    }, []);

    return (
        <div className="bg-white h-screen overflow-y-auto flex items-start" style={{ width: active ? '700px' : '350px' }}>
            {active && (
                <div className="border-r h-full" style={{ width: '350px' }}>
                    <SlackAddForm onClose={() => setActive(false)} />
                </div>
            )}
            <div className="shrink-0" style={{ width: '350px' }}>
                <div className="flex items-center p-5">
                    <h3 className="text-2xl mr-3">Slack</h3>
                    <Button rounded={true} icon="plus" variant="outline" onClick={onNew}/>
                </div>
                <SlackChannelList onEdit={onEdit} />
            </div>
        </div>
    );
};

SlackForm.displayName = 'SlackForm';

export default connect(
    (state: any) => ({
        istance: state.getIn(['slack', 'instance']),
    }),
    { fetchList, init }
)(SlackForm);
