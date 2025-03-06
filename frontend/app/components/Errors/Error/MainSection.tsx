import { RESOLVED } from 'Types/errorInfo';
import { FilterKey } from 'Types/filter/filterType';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { withRouter } from 'react-router-dom';

import { resentOrDate } from 'App/date';
import { useStore } from 'App/mstore';
import { sessions as sessionsRoute } from 'App/routes';
import Divider from 'Components/Errors/ui/Divider';
import ErrorName from 'Components/Errors/ui/ErrorName';
import Label from 'Components/Errors/ui/Label';
import { ErrorDetails, Icon, Loader } from 'UI';
import { Button } from 'antd';

import SessionBar from './SessionBar';
import { useTranslation } from 'react-i18next';

function MainSection(props) {
  const { t } = useTranslation();
  const { errorStore, searchStore } = useStore();
  const error = errorStore.instance;
  const trace = errorStore.instanceTrace;
  const { sourcemapUploaded } = errorStore;
  const loading = errorStore.isLoading;
  const { className } = props;

  const findSessions = () => {
    searchStore.addFilterByKeyAndValue(FilterKey.ERROR, error.message);
    props.history.push(sessionsRoute());
  };
  return (
    <div
      className={cn(
        className,
        'bg-white border-radius-3 thin-gray-border mb-6',
      )}
    >
      <div className="m-4">
        <ErrorName
          className="text-lg leading-relaxed"
          name={error.name}
          message={error.stack0InfoString}
          lineThrough={error.status === RESOLVED}
        />
        <div className="flex flex-col">
          <div
            className="flex items-center color-gray-dark font-semibold"
            style={{ wordBreak: 'break-all' }}
          >
            {error.message}
          </div>
          <div className="flex items-center mt-2">
            <div className="flex">
              <Label
                topValue={error.sessions}
                horizontal
                topValueSize="text-lg"
                bottomValue={t('Sessions')}
              />
              <Label
                topValue={error.users}
                horizontal
                topValueSize="text-lg"
                bottomValue={t('Users')}
              />
            </div>
            <div className="text-xs color-gray-medium">
              {t('Over the past 30 days')}
            </div>
          </div>
        </div>
      </div>

      <Divider />
      <div className="m-4">
        <div className="flex items-center">
          <h3 className="text-xl inline-block mr-2">
            {t('Last session with this error')}
          </h3>
          <span className="font-thin text-sm">
            {resentOrDate(error.lastOccurrence)}
          </span>
          <Button
            className="ml-auto"
            variant="text"
            onClick={findSessions}
            icon={<Icon className="ml-1" name="next1" color="teal" />}
            iconPosition="end"
          >
            {t('Find all sessions with this error')}
          </Button>
        </div>
        <SessionBar className="my-4" session={error.lastHydratedSession} />
        {error.customTags.length > 0 ? (
          <div className="flex items-start flex-col">
            <div>
              <span className="font-semibold">{t('More Info')}</span>{' '}
              <span className="text-disabled-text">
                ({t('most recent call')})
              </span>
            </div>
            <div className="mt-4 flex items-center gap-3 w-full flex-wrap">
              {error.customTags.map((tag) => (
                <div className="flex items-center rounded overflow-hidden bg-gray-lightest">
                  <div className="bg-gray-light-shade py-1 px-2 text-disabled-text">
                    {Object.entries(tag)[0][0]}
                  </div>{' '}
                  <div className="py-1 px-2 text-gray-dark">
                    {Object.entries(tag)[0][1]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <Divider />
      <div className="m-4">
        <Loader loading={loading}>
          <ErrorDetails
            name={error.name}
            message={error.message}
            errorStack={trace}
            error={error}
            sourcemapUploaded={sourcemapUploaded}
          />
        </Loader>
      </div>
    </div>
  );
}

export default withRouter(observer(MainSection));
