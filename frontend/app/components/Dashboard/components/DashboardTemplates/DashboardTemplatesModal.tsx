import {
  Button,
  Checkbox,
  Input,
  Modal,
  Progress,
  Space,
  Switch,
  Tag,
  Tooltip,
} from 'antd';
import { ArrowRight, Info } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import colors from 'tailwindcss/colors';

import { useStore } from 'App/mstore';
import { useHistory } from 'App/routing';
import { metricService } from 'App/services';

import {
  DASHBOARD_TEMPLATES,
  DashboardTemplate,
  TEMPLATE_GROUPS,
  TemplateCard,
} from './templates';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ExistingCard {
  metricId: number;
  name: string;
  metricType: string;
}

const PAGE_SIZE = 200;

/** Every card of the project, so the template can reuse the ones that already exist. */
async function fetchAllCards(): Promise<ExistingCard[]> {
  const all: ExistingCard[] = [];
  for (let page = 1; ; page += 1) {
    const resp = await metricService.getMetricsPaginated({
      page,
      limit: PAGE_SIZE,
      sortField: 'name',
      sortOrder: 'asc',
    });
    const list: any[] = resp?.list || [];
    all.push(
      ...list.map((m) => ({
        metricId: m.metricId,
        name: m.name,
        metricType: m.metricType,
      })),
    );
    if (list.length < PAGE_SIZE) break;
  }
  return all;
}

/**
 * "Create dashboard from template": pick a project type, adjust the few paths
 * the template needs, choose which cards (and whether alerts) to create, and
 * get a fully populated dashboard. Cards that already exist in the project
 * with the same name and type are reused instead of being duplicated.
 */
function DashboardTemplatesModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const history = useHistory();
  const { dashboardStore, projectsStore, userStore } = useStore();
  const { siteId, isMobile } = projectsStore;

  const templates = useMemo(() => DASHBOARD_TEMPLATES(t), [t]);
  const groups = useMemo(() => TEMPLATE_GROUPS(t), [t]);
  const platform = isMobile ? 'mobile' : 'web';
  const visibleTemplates = templates.filter((tpl) =>
    tpl.platforms.includes(platform),
  );

  const [selectedKey, setSelectedKey] = useState<string>('');
  const [name, setName] = useState('');
  const [params, setParams] = useState<Record<string, string>>({});
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [reuseExisting, setReuseExisting] = useState(true);
  const [existing, setExisting] = useState<ExistingCard[]>([]);
  const [lookup, setLookup] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [withAlerts, setWithAlerts] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, label: '' });

  const selected: DashboardTemplate | undefined = visibleTemplates.find(
    (tpl) => tpl.key === selectedKey,
  );

  const selectTemplate = (tpl: DashboardTemplate) => {
    setSelectedKey(tpl.key);
    setName(tpl.title);
    const defaults = Object.fromEntries(
      tpl.params.map((p) => [p.key, p.defaultValue]),
    );
    setParams(defaults);
    setSelectedCards(tpl.build(defaults, platform).cards.map((c) => c.key));
  };

  useEffect(() => {
    if (!open) return;
    const first = visibleTemplates[0];
    if (first) selectTemplate(first);
    setReuseExisting(true);
    setWithAlerts(true);
    setNotifyEmail(userStore.account?.email || '');
    setCreating(false);
    setProgress({ done: 0, total: 0, label: '' });
    loadExisting();
  }, [open, platform]);

  const loadExisting = () => {
    setLookup('loading');
    setExisting([]);
    fetchAllCards()
      .then((cards) => {
        setExisting(cards);
        setLookup('ready');
      })
      .catch((e) => {
        console.error(e);
        setLookup('error');
      });
  };

  const all = useMemo(
    () =>
      selected ? selected.build(params, platform) : { cards: [], alerts: [] },
    [selected, params, platform],
  );

  const existingFor = (card: TemplateCard): ExistingCard | undefined =>
    existing.find(
      (e) => e.name === card.name && e.metricType === card.metricType,
    );

  const chosen = useMemo(
    () => all.cards.filter((c) => selectedCards.includes(c.key)),
    [all, selectedCards],
  );
  const reuse = useMemo(() => {
    const map: Record<string, number> = {};
    if (!reuseExisting) return map;
    chosen.forEach((c) => {
      const match = existingFor(c);
      if (match) map[c.key] = match.metricId;
    });
    return map;
  }, [chosen, existing, reuseExisting]);
  const alerts = useMemo(
    () =>
      withAlerts
        ? all.alerts.filter(
            (a) => !a.card || chosen.some((c) => c.key === a.card),
          )
        : [],
    [all, chosen, withAlerts],
  );

  const reusedCount = Object.keys(reuse).length;
  const newCount = chosen.length - reusedCount;

  const toggleCard = (key: string, on: boolean) =>
    setSelectedCards((prev) =>
      on ? [...new Set([...prev, key])] : prev.filter((k) => k !== key),
    );
  const toggleGroup = (keys: string[], on: boolean) =>
    setSelectedCards((prev) =>
      on
        ? [...new Set([...prev, ...keys])]
        : prev.filter((k) => !keys.includes(k)),
    );

  // with reuse on, creating before the lookup finished would duplicate cards
  const canCreate =
    !!selected &&
    name.trim().length >= 3 &&
    chosen.length > 0 &&
    !creating &&
    (!reuseExisting || lookup === 'ready');

  const create = async () => {
    if (!selected) return;
    setCreating(true);
    try {
      const result = await dashboardStore.createFromTemplate(
        {
          name: name.trim(),
          description: selected.description,
          cards: chosen,
          alerts,
          reuse,
          notifyEmail: withAlerts ? notifyEmail.trim() : undefined,
        },
        (done, total, label) => setProgress({ done, total, label }),
      );
      if (result.reused > 0 || result.alertsSkipped > 0) {
        toast.info(
          t(
            '{{reused}} existing cards reused, {{skipped}} existing alerts kept',
            {
              reused: result.reused,
              skipped: result.alertsSkipped,
            },
          ),
        );
      }
      onClose();
      history.push(`/${siteId}/dashboard/${result.dashboardId}`);
    } catch (e) {
      console.error(e);
      toast.error(t('Dashboard could not be created from template'));
      setCreating(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={creating ? undefined : onClose}
      width={900}
      destroyOnHidden
      footer={null}
      closeIcon={!creating}
      styles={{ content: { backgroundColor: colors.gray[100] } }}
      centered
    >
      <div
        className="flex flex-col gap-4"
        style={{ maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}
      >
        <div>
          <div className="text-xl leading-4 font-medium">
            {t('Create dashboard from template')}
          </div>
          <div className="text-sm font-normal mt-3 text-gray-500 flex gap-2 items-center">
            <Info size={14} />
            {t(
              'Pick the kind of project you are tracking and get a dashboard with cards and alerts already configured.',
            )}
          </div>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {visibleTemplates.map((tpl) => (
            <div
              key={tpl.key}
              role="button"
              tabIndex={0}
              onClick={() => !creating && selectTemplate(tpl)}
              onKeyDown={(e) =>
                e.key === 'Enter' && !creating && selectTemplate(tpl)
              }
              className={`rounded-lg border p-3 bg-white cursor-pointer transition-all duration-200 hover:shadow-xs ${
                tpl.key === selectedKey
                  ? 'border-teal shadow-xs'
                  : 'border-transparent'
              }`}
            >
              <tpl.icon size={20} strokeWidth={1.5} className="mb-2" />
              <div className="font-medium leading-tight">{tpl.title}</div>
              <div className="text-xs text-gray-500 mt-1 leading-snug">
                {tpl.description}
              </div>
            </div>
          ))}
        </div>

        {selected && (
          <div className="rounded-lg bg-white p-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label
                  className="font-medium"
                  htmlFor="template-dashboard-name"
                >
                  {t('Dashboard name')}
                </label>
                <Input
                  id="template-dashboard-name"
                  value={name}
                  maxLength={100}
                  disabled={creating}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              {selected.params.map((p) => (
                <div key={p.key} className="flex flex-col gap-1">
                  <label
                    className="font-medium"
                    htmlFor={`template-param-${p.key}`}
                  >
                    {p.label}
                  </label>
                  <Input
                    id={`template-param-${p.key}`}
                    value={params[p.key] ?? ''}
                    placeholder={p.placeholder}
                    disabled={creating}
                    onChange={(e) =>
                      setParams({ ...params, [p.key]: e.target.value })
                    }
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="font-medium">{t('Cards')}</div>
              <Space>
                <Switch
                  checked={reuseExisting}
                  disabled={creating}
                  onChange={setReuseExisting}
                  size="small"
                />
                <span>{t('Reuse existing cards with the same name')}</span>
                <Tooltip
                  title={t(
                    'A card that already exists in this project with the same name and type is added to the dashboard instead of being created again.',
                  )}
                >
                  <Info size={14} className="text-gray-500" />
                </Tooltip>
              </Space>
            </div>

            {reuseExisting && lookup === 'loading' && (
              <div className="text-xs text-gray-500">
                {t('Checking which cards already exist…')}
              </div>
            )}
            {reuseExisting && lookup === 'error' && (
              <div className="text-xs text-red">
                {t('Existing cards could not be loaded.')}{' '}
                <Button type="link" size="small" onClick={loadExisting}>
                  {t('Retry')}
                </Button>
                {' · '}
                {t('or turn off reuse to create new cards anyway.')}
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {groups
                .map((g) => ({
                  ...g,
                  cards: all.cards.filter((c) => c.group === g.key),
                }))
                .filter((g) => g.cards.length > 0)
                .map((g) => {
                  const keys = g.cards.map((c) => c.key);
                  const on = keys.filter((k) => selectedCards.includes(k));
                  return (
                    <div key={g.key} className="flex flex-col gap-1">
                      <Checkbox
                        checked={on.length === keys.length}
                        indeterminate={on.length > 0 && on.length < keys.length}
                        disabled={creating}
                        onChange={(e) => toggleGroup(keys, e.target.checked)}
                      >
                        <span className="font-medium">{g.label}</span>
                        <span className="text-gray-500">
                          {' '}
                          · {on.length}/{keys.length}
                        </span>
                      </Checkbox>
                      <div className="flex flex-col gap-1 ml-6">
                        {g.cards.map((c) => {
                          const match = existingFor(c);
                          return (
                            <Checkbox
                              key={c.key}
                              checked={selectedCards.includes(c.key)}
                              disabled={creating}
                              onChange={(e) =>
                                toggleCard(c.key, e.target.checked)
                              }
                            >
                              <span className="text-sm">{c.name}</span>
                              {match &&
                                (reuseExisting ? (
                                  <Tag className="ml-2" color="green">
                                    {t('exists · reused')}
                                  </Tag>
                                ) : (
                                  <Tag className="ml-2" color="orange">
                                    {t('exists · duplicate')}
                                  </Tag>
                                ))}
                            </Checkbox>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="flex items-center gap-4">
              <Space>
                <Switch
                  checked={withAlerts}
                  disabled={creating}
                  onChange={setWithAlerts}
                  size="small"
                />
                <span className="font-medium">
                  {t('Also create alerts')}
                  {withAlerts && alerts.length > 0 && (
                    <span className="text-gray-500"> · {alerts.length}</span>
                  )}
                </span>
                <Tooltip
                  title={t(
                    'Threshold and change alerts on errors, performance and traffic. Alerts that already exist with the same name are kept as they are.',
                  )}
                >
                  <Info size={14} className="text-gray-500" />
                </Tooltip>
              </Space>
              {withAlerts && (
                <Input
                  value={notifyEmail}
                  placeholder={t('Notification email (optional)')}
                  disabled={creating}
                  style={{ width: 280 }}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                />
              )}
            </div>

            {creating && progress.total > 0 && (
              <div>
                <Progress
                  percent={Math.round((progress.done / progress.total) * 100)}
                  size="small"
                />
                <div className="text-xs text-gray-500">{progress.label}</div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-4">
          <span className="text-sm text-gray-500">
            {t('{{count}} new cards', { count: newCount })}
            {reusedCount > 0 &&
              ` · ${t('{{count}} reused', { count: reusedCount })}`}
            {alerts.length > 0 &&
              ` · ${t('{{count}} alerts', { count: alerts.length })}`}
          </span>
          <Button
            type="primary"
            onClick={create}
            disabled={!canCreate}
            loading={creating}
          >
            <Space>
              {t('Create dashboard')}
              <ArrowRight size={14} />
            </Space>
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default observer(DashboardTemplatesModal);
