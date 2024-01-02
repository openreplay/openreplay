import React, { useEffect, useState } from 'react';
import { Conditions } from 'App/mstore/types/FeatureFlag';
import { Icon, Input, Loader } from 'UI';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { connect } from 'react-redux';
import cn from 'classnames';
import { Switch, Drawer, Button, Tooltip } from 'antd';
import ConditionalRecordingSettings from 'Shared/SessionSettings/components/ConditionalRecordingSettings';

type Props = {
  isAdmin: boolean;
  projectId?: number;
  setShowCaptureRate: (show: boolean) => void;
  open: boolean;
  showCaptureRate: boolean;
};

function CaptureRate(props: Props) {
  const [conditions, setConditions] = React.useState<Conditions[]>([]);
  const { isAdmin, projectId } = props;
  const { settingsStore } = useStore();
  const [changed, setChanged] = useState(false);
  const {
    sessionSettings: {
      captureRate,
      changeCaptureRate,
      captureAll,
      changeCaptureAll,
      captureConditions,
    },
    loadingCaptureRate,
    updateCaptureConditions,
    fetchCaptureConditions,
  } = settingsStore;

  useEffect(() => {
    if (projectId) {
      void fetchCaptureConditions(projectId);
    }
  }, [projectId]);

  React.useEffect(() => {
    setConditions(captureConditions.map((condition: any) => new Conditions(condition, true)));
  }, [captureConditions]);

  const onCaptureRateChange = (input: string) => {
    setChanged(true);
    changeCaptureRate(input);
  };

  const toggleRate = () => {
    setChanged(true);
    const newValue = !captureAll;
    changeCaptureAll(newValue);
    if (newValue) {
      changeCaptureRate('100');
    }
  };

  const onUpdate = () => {
    updateCaptureConditions(projectId!, {
      rate: parseInt(captureRate, 10),
      captureAll,
      conditions: conditions.map((c) => c.toCaptureCondition()),
    }).finally(() => setChanged(false));
  };

  const updateDisabled = !changed || !isAdmin || (captureAll && conditions.length === 0);

  return (
    <Drawer
      size={'large'}
      open={props.open}
      styles={{ content: { background: '#F6F6F6' } }}
      onClose={() => props.setShowCaptureRate(false)}
      title={
        <div className={'flex items-center w-full gap-2'}>
          <span className={'font-semibold'}>Capture Rate</span>
          <div className={'ml-auto'}></div>
          <Button type={'primary'} ghost onClick={() => props.setShowCaptureRate(false)}>
            Cancel
          </Button>
          <Button disabled={updateDisabled} type={'primary'} onClick={onUpdate}>
            Update
          </Button>
        </div>
      }
      closable={false}
      destroyOnClose
    >
      <Loader loading={loadingCaptureRate || !projectId}>
        <Tooltip title={isAdmin ? '' : "You don't have permission to change."}>
          <div className="my-2 flex items-center gap-2 h-8">
            <div className="font-semibold">The percentage of session you want to capture</div>
            <Tooltip
              title={
                'Define the percentage of user sessions to be recorded for detailed replay and analysis.' +
                '\nSessions exceeding this specified limit will not be captured or stored.'
              }
            >
              <Icon size={16} color={'black'} name={'info-circle'} />
            </Tooltip>
            <Switch
              checked={captureAll}
              onChange={toggleRate}
              checkedChildren={'Conditional'}
              disabled={!isAdmin}
              unCheckedChildren={'Capture Rate'}
            />
            {!captureAll ? (
              <div className={cn('relative', { disabled: !isAdmin })}>
                <Input
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    if (/^\d+$/.test(e.target.value) || e.target.value === '') {
                      onCaptureRateChange(e.target.value);
                    }
                  }}
                  value={captureRate.toString()}
                  style={{ height: '38px', width: '70px' }}
                  disabled={captureAll}
                  min={0}
                  max={100}
                />
                <Icon
                  className="absolute right-0 mr-2 top-0 bottom-0 m-auto"
                  name="percent"
                  color="gray-medium"
                  size="18"
                />
              </div>
            ) : null}
          </div>
          {captureAll ? (
            <ConditionalRecordingSettings
              setChanged={setChanged}
              conditions={conditions}
              setConditions={setConditions}
            />
          ) : null}
        </Tooltip>
      </Loader>
    </Drawer>
  );
}

export default connect((state: any) => ({
  isAdmin:
    state.getIn(['user', 'account', 'admin']) || state.getIn(['user', 'account', 'superAdmin']),
}))(observer(CaptureRate));
