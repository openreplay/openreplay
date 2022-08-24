import React, { useEffect } from 'react';
import { Button, Form, Input, SegmentSelection, Checkbox, Message, Link, Icon } from 'UI';
import { alertMetrics as metrics } from 'App/constants';
import { alertConditions as conditions } from 'App/constants';
import { client, CLIENT_TABS } from 'App/routes';
import { connect } from 'react-redux';
import stl from './alertForm.module.css';
import DropdownChips from './DropdownChips';
import { validateEmail } from 'App/validate';
import cn from 'classnames';
import { fetchTriggerOptions } from 'Duck/alerts';
import Select from 'Shared/Select';

const thresholdOptions = [
    { label: '15 minutes', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '2 hours', value: 120 },
    { label: '4 hours', value: 240 },
    { label: '1 day', value: 1440 },
];

const changeOptions = [
    { label: 'change', value: 'change' },
    { label: '% change', value: 'percent' },
];

const Circle = ({ text }) => <div className="circle mr-4 w-6 h-6 rounded-full bg-gray-light flex items-center justify-center">{text}</div>;

const Section = ({ index, title, description, content }) => (
    <div className="w-full">
        <div className="flex items-start">
            <Circle text={index} />
            <div>
                <span className="font-medium">{title}</span>
                {description && <div className="text-sm color-gray-medium">{description}</div>}
            </div>
        </div>

        <div className="ml-10">{content}</div>
    </div>
);

const integrationsRoute = client(CLIENT_TABS.INTEGRATIONS);

const AlertForm = (props) => {
    const {
        instance,
        slackChannels,
        webhooks,
        loading,
        onDelete,
        deleting,
        triggerOptions,
        metricId,
        style = { width: '580px', height: '100vh' },
    } = props;
    const write = ({ target: { value, name } }) => props.edit({ [name]: value });
    const writeOption = (e, { name, value }) => props.edit({ [name]: value.value });
    const onChangeCheck = ({ target: { checked, name } }) => props.edit({ [name]: checked });
    // const onChangeOption = ({ checked, name }) => props.edit({ [ name ]: checked })
    // const onChangeCheck = (e) => { console.log(e) }

    useEffect(() => {
        props.fetchTriggerOptions();
    }, []);

    const writeQueryOption = (e, { name, value }) => {
        const { query } = instance;
        props.edit({ query: { ...query, [name]: value } });
    };

    const writeQuery = ({ target: { value, name } }) => {
        const { query } = instance;
        props.edit({ query: { ...query, [name]: value } });
    };

    const metric = instance && instance.query.left ? triggerOptions.find((i) => i.value === instance.query.left) : null;
    const unit = metric ? metric.unit : '';
    const isThreshold = instance.detectionMethod === 'threshold';

    return (
        <Form className={cn('p-6 pb-10', stl.wrapper)} style={style} onSubmit={() => props.onSubmit(instance)} id="alert-form">
            <div className={cn(stl.content, '-mx-6 px-6 pb-12')}>
                <input
                    autoFocus={true}
                    className="text-lg border border-gray-light rounded w-full"
                    name="name"
                    style={{ fontSize: '18px', padding: '10px', fontWeight: '600' }}
                    value={instance && instance.name}
                    onChange={write}
                    placeholder="Untiltled Alert"
                    id="name-field"
                />
                <div className="mb-8" />
                <Section
                    index="1"
                    title={'What kind of alert do you want to set?'}
                    content={
                        <div>
                            <SegmentSelection
                                primary
                                name="detectionMethod"
                                className="my-3"
                                onSelect={(e, { name, value }) => props.edit({ [name]: value })}
                                value={{ value: instance.detectionMethod }}
                                list={[
                                    { name: 'Threshold', value: 'threshold' },
                                    { name: 'Change', value: 'change' },
                                ]}
                            />
                            <div className="text-sm color-gray-medium">
                                {isThreshold && 'Eg. Alert me if memory.avg is greater than 500mb over the past 4 hours.'}
                                {!isThreshold &&
                                    'Eg. Alert me if % change of memory.avg is greater than 10% over the past 4 hours compared to the previous 4 hours.'}
                            </div>
                            <div className="my-4" />
                        </div>
                    }
                />

                <hr className="my-8" />

                <Section
                    index="2"
                    title="Condition"
                    content={
                        <div>
                            {!isThreshold && (
                                <div className="flex items-center my-3">
                                    <label className="w-2/6 flex-shrink-0 font-normal">{'Trigger when'}</label>
                                    <Select
                                        className="w-4/6"
                                        placeholder="change"
                                        options={changeOptions}
                                        name="change"
                                        defaultValue={instance.change}
                                        onChange={({ value }) => writeOption(null, { name: 'change', value })}
                                        id="change-dropdown"
                                    />
                                </div>
                            )}

                            <div className="flex items-center my-3">
                                <label className="w-2/6 flex-shrink-0 font-normal">{isThreshold ? 'Trigger when' : 'of'}</label>
                                <Select
                                    className="w-4/6"
                                    placeholder="Select Metric"
                                    isSearchable={true}
                                    options={triggerOptions}
                                    name="left"
                                    value={triggerOptions.find((i) => i.value === instance.query.left)}
                                    // onChange={ writeQueryOption }
                                    onChange={({ value }) => writeQueryOption(null, { name: 'left', value: value.value })}
                                />
                            </div>

                            <div className="flex items-center my-3">
                                <label className="w-2/6 flex-shrink-0 font-normal">{'is'}</label>
                                <div className="w-4/6 flex items-center">
                                    <Select
                                        placeholder="Select Condition"
                                        options={conditions}
                                        name="operator"
                                        defaultValue={instance.query.operator}
                                        // onChange={ writeQueryOption }
                                        onChange={({ value }) => writeQueryOption(null, { name: 'operator', value: value.value })}
                                    />
                                    {unit && (
                                        <>
                                            <Input
                                                className="px-4"
                                                style={{ marginRight: '31px' }}
                                                // label={{ basic: true, content: unit }}
                                                // labelPosition='right'
                                                name="right"
                                                value={instance.query.right}
                                                onChange={writeQuery}
                                                placeholder="E.g. 3"
                                            />
                                            <span className="ml-2">{'test'}</span>
                                        </>
                                    )}
                                    {!unit && (
                                        <Input
                                            wrapperClassName="ml-2"
                                            // className="pl-4"
                                            name="right"
                                            value={instance.query.right}
                                            onChange={writeQuery}
                                            placeholder="Specify value"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center my-3">
                                <label className="w-2/6 flex-shrink-0 font-normal">{'over the past'}</label>
                                <Select
                                    className="w-2/6"
                                    placeholder="Select timeframe"
                                    options={thresholdOptions}
                                    name="currentPeriod"
                                    defaultValue={instance.currentPeriod}
                                    // onChange={ writeOption }
                                    onChange={({ value }) => writeOption(null, { name: 'currentPeriod', value })}
                                />
                            </div>
                            {!isThreshold && (
                                <div className="flex items-center my-3">
                                    <label className="w-2/6 flex-shrink-0 font-normal">{'compared to previous'}</label>
                                    <Select
                                        className="w-2/6"
                                        placeholder="Select timeframe"
                                        options={thresholdOptions}
                                        name="previousPeriod"
                                        defaultValue={instance.previousPeriod}
                                        // onChange={ writeOption }
                                        onChange={({ value }) => writeOption(null, { name: 'previousPeriod', value })}
                                    />
                                </div>
                            )}
                        </div>
                    }
                />

                <hr className="my-8" />

                <Section
                    index="3"
                    title="Notify Through"
                    description="You'll be noticed in app notifications. Additionally opt in to receive alerts on:"
                    content={
                        <div className="flex flex-col">
                            <div className="flex items-center my-4">
                                <Checkbox
                                    name="slack"
                                    className="mr-8"
                                    type="checkbox"
                                    checked={instance.slack}
                                    onClick={onChangeCheck}
                                    label="Slack"
                                />
                                <Checkbox
                                    name="email"
                                    type="checkbox"
                                    checked={instance.email}
                                    onClick={onChangeCheck}
                                    className="mr-8"
                                    label="Email"
                                />
                                <Checkbox name="webhook" type="checkbox" checked={instance.webhook} onClick={onChangeCheck} label="Webhook" />
                            </div>

                            {instance.slack && (
                                <div className="flex items-start my-4">
                                    <label className="w-2/6 flex-shrink-0 font-normal pt-2">{'Slack'}</label>
                                    <div className="w-4/6">
                                        <DropdownChips
                                            fluid
                                            selected={instance.slackInput}
                                            options={slackChannels}
                                            placeholder="Select Channel"
                                            onChange={(selected) => props.edit({ slackInput: selected })}
                                        />
                                    </div>
                                </div>
                            )}

                            {instance.email && (
                                <div className="flex items-start my-4">
                                    <label className="w-2/6 flex-shrink-0 font-normal pt-2">{'Email'}</label>
                                    <div className="w-4/6">
                                        <DropdownChips
                                            textFiled
                                            validate={validateEmail}
                                            selected={instance.emailInput}
                                            placeholder="Type and press Enter key"
                                            onChange={(selected) => props.edit({ emailInput: selected })}
                                        />
                                    </div>
                                </div>
                            )}

                            {instance.webhook && (
                                <div className="flex items-start my-4">
                                    <label className="w-2/6 flex-shrink-0 font-normal pt-2">{'Webhook'}</label>
                                    <DropdownChips
                                        fluid
                                        selected={instance.webhookInput}
                                        options={webhooks}
                                        placeholder="Select Webhook"
                                        onChange={(selected) => props.edit({ webhookInput: selected })}
                                    />
                                </div>
                            )}
                        </div>
                    }
                />
            </div>

            <div className="flex items-center justify-between absolute bottom-0 left-0 right-0 p-6 border-t z-10 bg-white">
                <div className="flex items-center">
                    <Button loading={loading} variant="primary" type="submit" disabled={loading || !instance.validate()} id="submit-button">
                        {instance.exists() ? 'Update' : 'Create'}
                    </Button>
                    <div className="mx-1" />
                    <Button onClick={props.onClose}>Cancel</Button>
                </div>
                <div>
                    {instance.exists() && (
                        <Button hover variant="text" loading={deleting} type="button" onClick={() => onDelete(instance)} id="trash-button">
                            <Icon name="trash" color="gray-medium" size="18" />
                        </Button>
                    )}
                </div>
            </div>
        </Form>
    );
};

export default connect(
    (state) => ({
        instance: state.getIn(['alerts', 'instance']),
        triggerOptions: state.getIn(['alerts', 'triggerOptions']),
        loading: state.getIn(['alerts', 'saveRequest', 'loading']),
        deleting: state.getIn(['alerts', 'removeRequest', 'loading']),
    }),
    { fetchTriggerOptions }
)(AlertForm);
