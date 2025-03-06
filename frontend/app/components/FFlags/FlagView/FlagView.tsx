import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { Loader, NoContent, ItemMenu } from 'UI';
import { Button, Switch } from 'antd';
import Breadcrumb from 'Shared/Breadcrumb';
import { useHistory } from 'react-router';
import { withSiteId, fflag, fflags } from 'App/routes';
import Multivariant from 'Components/FFlags/NewFFlag/Multivariant';
import { toast } from 'react-toastify';
import RolloutCondition from 'Shared/ConditionSet';
import { useTranslation } from 'react-i18next';

function FlagView({ siteId, fflagId }: { siteId: string; fflagId: string }) {
  const { t } = useTranslation();
  const { featureFlagsStore } = useStore();
  const history = useHistory();

  React.useEffect(() => {
    if (fflagId) {
      void featureFlagsStore.fetchFlag(parseInt(fflagId, 10));
    }
  }, [fflagId]);

  const current = featureFlagsStore.currentFflag;
  if (featureFlagsStore.isLoading) return <Loader loading />;
  if (!current) return <NoContent title={t('No flag found')} />;

  const deleteHandler = () => {
    featureFlagsStore.deleteFlag(current.featureFlagId).then(() => {
      toast.success(t('Feature flag deleted.'));
      history.push(withSiteId(fflags(), siteId));
    });
  };

  const menuItems = [
    { icon: 'trash', text: t('Delete'), onClick: deleteHandler },
  ];

  const toggleActivity = () => {
    const newValue = !current.isActive;
    current.setIsEnabled(newValue);
    featureFlagsStore
      .updateFlagStatus(current.featureFlagId, newValue)
      .then(() => {
        toast.success(t('Feature flag status has been updated.'));
      })
      .catch(() => {
        current.setIsEnabled(!newValue);
        toast.error(t('Something went wrong, please try again.'));
      });
  };

  return (
    <div className="w-full mx-auto mb-4" style={{ maxWidth: '1360px' }}>
      <Breadcrumb
        items={[
          { label: t('Feature Flags'), to: withSiteId(fflags(), siteId) },
          { label: current.flagKey },
        ]}
      />

      <div className="w-full bg-white rounded p-4 widget-wrapper">
        <div className="flex items-center gap-2">
          <div className="text-2xl">{current.flagKey}</div>
          <Button
            className="ml-auto text-main"
            type="text"
            onClick={() =>
              history.push(
                withSiteId(
                  fflag(
                    featureFlagsStore.currentFflag?.featureFlagId.toString(),
                  ),
                  siteId,
                ),
              )
            }
          >
            {t('Edit')}
          </Button>
          <ItemMenu bold items={menuItems} />
        </div>
        <div className="border-b" style={{ color: 'rgba(0,0,0, 0.6)' }}>
          {current.description ||
            'There is no description for this feature flag.'}
        </div>

        <div className="mt-4">
          <label className="font-semibold">{t('Status')}</label>
          <div className="flex items-center gap-2">
            <Switch checked={current.isActive} onChange={toggleActivity} />
            <div>{current.isActive ? t('Enabled') : t('Disabled')}</div>
          </div>
        </div>
        <div className="mt-4">
          <label className="font-semibold">{t('Persistence')}</label>
          <div>
            {current.isPersist
              ? t(
                  'This flag maintains its state through successive authentication events.',
                )
              : t('This flag is not persistent across authentication events.')}
          </div>
        </div>
        {!current.isSingleOption ? <Multivariant readonly /> : null}
        {current.conditions.length > 0 ? (
          <div className="mt-6 p-4 rounded bg-gray-lightest">
            <label className="font-semibold">{t('Rollout Conditions')}</label>
            {current.conditions.map((condition, index) => (
              <React.Fragment key={index}>
                <RolloutCondition
                  set={index + 1}
                  readonly
                  index={index}
                  conditions={condition}
                  removeCondition={current.removeCondition}
                />
                <div className="mt-2" />
              </React.Fragment>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default observer(FlagView);
