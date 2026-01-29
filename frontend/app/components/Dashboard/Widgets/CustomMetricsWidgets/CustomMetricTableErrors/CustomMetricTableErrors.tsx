import React, { useEffect } from 'react';
import { Pagination, NoContent, Icon } from 'UI';
import ErrorListItem from 'App/components/Dashboard/components/Errors/ErrorListItem';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { useModal } from 'App/components/Modal';
import ErrorDetailsModal from 'App/components/Dashboard/components/Errors/ErrorDetailsModal';
import { useTranslation } from 'react-i18next';
import { Space } from 'antd';
import { ArrowRight } from 'lucide-react';

interface Props {
  metric: any;
  data: any;
  isEdit: any;
  history: any;
  location: any;
  inGrid?: boolean;
}
function CustomMetricTableErrors(props: RouteComponentProps & Props) {
  const { t } = useTranslation();
  const { metric, data } = props;
  const errorId = new URLSearchParams(props.location.search).get('errorId');
  const { showModal } = useModal();

  const onErrorClick = (e: any, error: any) => {
    e.stopPropagation();
    const urlParams = new URLSearchParams(props.location.search);
    // add new param to old ones
    urlParams.set('errorId', error.errorId);
    props.history.replace({
      search: urlParams.toString(),
    });
  };

  useEffect(() => {
    if (!errorId) return;

    showModal(<ErrorDetailsModal errorId={errorId} />, {
      right: true,
      width: 1200,
      onClose: () => {
        if (
          props.history.location.pathname.includes('/dashboard') ||
          props.history.location.pathname.includes('/metrics/')
        ) {
          const urlParams = new URLSearchParams(props.location.search);
          urlParams.delete('errorId');
          props.history.replace({ search: urlParams.toString() });
        }
      },
    });
  }, [errorId]);

  const errors = data.errors || [];
  const displayedData = props.inGrid ? errors.slice(0, 3) : errors;
  const rest = errors.length - displayedData.length;
  return (
    <NoContent
      title={
        <div className="flex items-center">
          <Icon name="info-circle" size={14} className="mr-2" />
          {t('No data available for the selected period.')}
        </div>
      }
      show={!data.errors || data.errors.length === 0}
      size="small"
      style={{ minHeight: 220 }}
    >
      <div className="pb-4">
        {displayedData &&
          displayedData.map((error: any, index: any) => (
            <div key={index} className="border-b last:border-none">
              <ErrorListItem
                error={error}
                onClick={(e) => onErrorClick(e, error)}
              />
            </div>
          ))}

        {props.inGrid ? (
          rest > 0 ? (
            <div className="flex link pt-1">
              <Space className="flex! font-medium! gap-1! text-black! hover:text-main!">
                {rest}&nbsp;{t('More')}
                <ArrowRight size={16} />
              </Space>
            </div>
          ) : null
        ) : (
          <div className="my-6 flex items-center justify-center">
            <Pagination
              page={metric.page}
              total={data.total}
              onPageChange={(page: any) => metric.updateKey('page', page)}
              limit={5}
              debounceRequest={500}
            />
          </div>
        )}
      </div>
    </NoContent>
  );
}

export default withRouter<Props & RouteComponentProps, React.FunctionComponent>(
  CustomMetricTableErrors,
);
