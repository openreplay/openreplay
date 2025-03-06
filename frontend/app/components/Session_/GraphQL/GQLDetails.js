import React from 'react';
import { JSONTree } from 'UI';
import cn from 'classnames';
import { withTranslation } from 'react-i18next';

class GQLDetails extends React.PureComponent {
  render() {
    const {
      gql: { variables, response, duration, operationKind, operationName },
      first = false,
      last = false,
      t,
    } = this.props;

    let jsonVars;
    let jsonResponse;
    try {
      jsonVars = JSON.parse(variables);
    } catch (e) {}
    try {
      jsonResponse = JSON.parse(response);
    } catch (e) {}
    const dataClass = cn('p-2 bg-gray-lightest rounded color-gray-darkest');
    return (
      <div className="px-4 pb-16">
        <h5 className="mb-2">{t('Operation Name')}</h5>
        <div className={dataClass}>{operationName}</div>

        <div className="flex items-center gap-4 mt-4">
          <div className="w-6/12">
            <div className="mb-2">{t('Operation Kind')}</div>
            <div className={dataClass}>{operationKind}</div>
          </div>
          <div className="w-6/12">
            <div className="mb-2">{t('Duration')}</div>
            <div className={dataClass}>
              {duration ? parseInt(duration) : '???'}&nbsp;{t('ms')}
            </div>
          </div>
        </div>

        <div
          style={{ height: 'calc(100vh - 264px)', overflowY: 'auto' }}
          className="border-t border-t-gray-light mt-2 py-2"
        >
          <div>
            <div className="flex justify-between items-start mb-2">
              <h5 className="mt-1 mr-1">{t('Variables')}</h5>
            </div>
            <div className={dataClass}>
              {jsonVars === undefined ? variables : <JSONTree src={jsonVars} />}
            </div>
            <div className="divider" />
          </div>

          <div>
            <div className="flex justify-between items-start mt-6 mb-2">
              <h5 className="mt-1 mr-1">{t('Response')}</h5>
            </div>
            <div className={dataClass}>
              {jsonResponse === undefined ? (
                response
              ) : (
                <JSONTree src={jsonResponse} />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default withTranslation()(GQLDetails);
