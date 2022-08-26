import React from 'react';
import { connect } from 'react-redux';
import cn from 'classnames';
import { CloseButton } from 'UI';
import { fetchWidget } from 'Duck/dashboard';
// import { updateAppearance } from 'Duck/user';
import { WIDGET_MAP } from 'Types/dashboard';
import Title from './Title';
import stl from './widgetHOC.module.css';

export default (widgetKey, panelProps = {}, wrapped = true, allowedFilters = []) =>
  (BaseComponent) => {
    @connect(
      (state, props) => {
        const compare = props && props.compare;
        const key = compare ? '_' + widgetKey : widgetKey;

        return {
          loading: state.getIn(['dashboard', 'fetchWidget', key, 'loading']),
          data: state.getIn(['dashboard', key]),
          comparing: state.getIn(['dashboard', 'comparing']),
          filtersSize: state.getIn(['dashboard', 'filters']).size,
          filters: state.getIn(['dashboard', compare ? 'filtersCompare' : 'filters']),
          period: state.getIn(['dashboard', compare ? 'periodCompare' : 'period']), //TODO: filters
          platform: state.getIn(['dashboard', 'platform']),
          // appearance: state.getIn([ 'user', 'account', 'appearance' ]),

          dataCompare: state.getIn(['dashboard', '_' + widgetKey]), // only for overview
          loadingCompare: state.getIn(['dashboard', 'fetchWidget', '_' + widgetKey, 'loading']),
          filtersCompare: state.getIn(['dashboard', 'filtersCompare']),
          periodCompare: state.getIn(['dashboard', 'periodCompare']), //TODO: filters
        };
      },
      {
        fetchWidget,
        // updateAppearance,
      }
    )
    class WidgetWrapper extends React.PureComponent {
      constructor(props) {
        super(props);
        const params = panelProps.customParams
          ? panelProps.customParams(this.props.period.rangeName)
          : {};
        if (props.testId) {
          params.testId = parseInt(props.testId);
        }
        params.compare = this.props.compare;
        const filters =
          allowedFilters.length > 0
            ? props.filters.filter((f) => allowedFilters.includes(f.key))
            : props.filters;
        props.fetchWidget(widgetKey, props.period, props.platform, params, filters);
      }

      componentDidUpdate(prevProps) {
        if (
          prevProps.period !== this.props.period ||
          prevProps.platform !== this.props.platform ||
          prevProps.filters.size !== this.props.filters.size
        ) {
          const params = panelProps.customParams
            ? panelProps.customParams(this.props.period.rangeName)
            : {};
          if (this.props.testId) {
            params.testId = parseInt(this.props.testId);
          }
          params.compare = this.props.compare;
          const filters =
            allowedFilters.length > 0
              ? this.props.filters.filter((f) => allowedFilters.includes(f.key))
              : this.props.filters;
          this.props.fetchWidget(
            widgetKey,
            this.props.period,
            this.props.platform,
            params,
            filters
          );
        }

        // handling overview widgets
        if (
          (!prevProps.comparing ||
            prevProps.periodCompare !== this.props.periodCompare ||
            prevProps.filtersCompare.size !== this.props.filtersCompare.size) &&
          this.props.comparing &&
          this.props.isOverview
        ) {
          const params = panelProps.customParams
            ? panelProps.customParams(this.props.period.rangeName)
            : {};
          params.compare = true;
          const filtersCompare =
            allowedFilters.length > 0
              ? this.props.filtersCompare.filter((f) => allowedFilters.includes(f.key))
              : this.props.filtersCompare;
          this.props.fetchWidget(
            widgetKey,
            this.props.periodCompare,
            this.props.platform,
            params,
            filtersCompare
          );
        }
      }

      handleRemove = () => {
        // const { appearance } = this.props;
        // this.props.updateAppearance(appearance.setIn([ 'dashboard', widgetKey ], false));
      };

      render() {
        const { comparing, compare } = this.props;

        return wrapped ? (
          <div className={cn(stl.wrapper, { [stl.comparing]: comparing })}>
            <div
              className={cn(stl.panel, 'flex flex-col relative', {
                [stl.fullwidth]: panelProps.fullwidth,
                [stl.fitContent]: panelProps.fitContent,
                [stl.minHeight]: !panelProps.fitContent,
              })}
            >
              <div className="flex items-center mb-2">
                {comparing && (
                  <div className={cn(stl.circle, { 'bg-tealx': !compare, 'bg-teal': compare })} />
                )}
                <Title title={panelProps.name ? panelProps.name : WIDGET_MAP[widgetKey].name} />
                {
                  <CloseButton
                    className={cn(stl.closeButton, 'ml-auto')}
                    onClick={this.handleRemove}
                    size="17"
                  />
                }
              </div>
              <div className="flex-1 flex flex-col">
                <BaseComponent {...this.props} />
              </div>
            </div>
          </div>
        ) : (
          <BaseComponent {...this.props} />
        );
      }
    }
    return WidgetWrapper;
  };
