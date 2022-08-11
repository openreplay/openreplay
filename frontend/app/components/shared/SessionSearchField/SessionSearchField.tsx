import React, { useState } from 'react';
import { connect } from 'react-redux';
import { Input } from 'UI';
import FilterModal from 'Shared/Filters/FilterModal';
import { debounce } from 'App/utils';
import { assist as assistRoute, isRoute } from 'App/routes';
const ASSIST_ROUTE = assistRoute();

interface Props {
    fetchFilterSearch: (query: any) => void;
    addFilterByKeyAndValue: (key: string, value: string) => void;
    filterList: any;
    filterListLive: any;
    filterSearchListLive: any;
    filterSearchList: any;
}
function SessionSearchField(props: Props) {
    const debounceFetchFilterSearch = React.useCallback(debounce(props.fetchFilterSearch, 1000), []);
    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const onSearchChange = ({ target: { value } }: any) => {
        setSearchQuery(value);
        debounceFetchFilterSearch({ q: value });
    };

    const onAddFilter = (filter: any) => {
        props.addFilterByKeyAndValue(filter.key, filter.value);
    };

    return (
        <div className="relative">
            <Input
                icon="search"
                onFocus={() => setShowModal(true)}
                onBlur={() => setTimeout(setShowModal, 200, false)}
                onChange={onSearchChange}
                placeholder={'Search sessions using any captured event (click, input, page, error...)'}
                id="search"
                type="search"
                autoComplete="off"
                className="hover:border-gray-medium text-lg placeholder-lg"
            />

            {showModal && (
                <div className="absolute left-0 border shadow rounded bg-white z-50">
                    <FilterModal
                        searchQuery={searchQuery}
                        isMainSearch={true}
                        onFilterClick={onAddFilter}
                        isLive={isRoute(ASSIST_ROUTE, window.location.pathname)}
                        // filters={isRoute(ASSIST_ROUTE, window.location.pathname) ? props.filterListLive : props.filterList }
                        // filterSearchList={isRoute(ASSIST_ROUTE, window.location.pathname) ? props.filterSearchListLive : props.filterSearchList }
                    />
                </div>
            )}
        </div>
    );
}

export default connect(
    (state: any) => ({
        filterSearchList: state.getIn(['search', 'filterSearchList']),
        filterSearchListLive: state.getIn(['liveSearch', 'filterSearchList']),
        filterList: state.getIn(['search', 'filterList']),
        filterListLive: state.getIn(['search', 'filterListLive']),
    }),
    {}
)(SessionSearchField);
