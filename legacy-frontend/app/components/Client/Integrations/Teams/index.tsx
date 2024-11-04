import React, { useEffect } from 'react';
import TeamsChannelList from './TeamsChannelList';
import { fetchList, init } from 'Duck/integrations/teams';
import { connect } from 'react-redux';
import TeamsAddForm from './TeamsAddForm';
import { Button } from 'UI';

interface Props {
    onEdit?: (integration: any) => void;
    istance: any;
    fetchList: any;
    init: any;
}
const MSTeams = (props: Props) => {
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
                    <TeamsAddForm onClose={() => setActive(false)} />
                </div>
            )}
            <div className="shrink-0" style={{ width: '350px' }}>
                <div className="flex items-center p-5">
                    <h3 className="text-2xl mr-3">Microsoft Teams</h3>
                    <Button rounded={true} icon="plus" iconSize={24} variant="outline" onClick={onNew}/>
                </div>
                <TeamsChannelList onEdit={onEdit} />
            </div>
        </div>
    );
};

MSTeams.displayName = 'MSTeams';

export default connect(
    (state: any) => ({
        istance: state.getIn(['teams', 'instance']),
    }),
    { fetchList, init }
)(MSTeams);
