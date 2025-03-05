import React from 'react';
import ExCard from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/ExCard';
import CallWithErrors from 'Components/Dashboard/Widgets/PredefinedWidgets/CallWithErrors';

interface Props {
  title: string;
  type: string;
  onCard: (card: string) => void;
  onClick?: any;
  data?: any;
}

function CallsWithErrorsExample(props: Props) {
  return (
    <ExCard {...props}>
      <div className="eg-card">
        <CallWithErrors data={props.data} />
      </div>
    </ExCard>
  );
}

export default CallsWithErrorsExample;
