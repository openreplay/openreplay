import React, { useEffect, useState } from 'react';
import { Icon } from 'UI';
import { debounce } from 'App/utils';
import { changeSearch } from 'Duck/alerts';
import { connect } from 'react-redux';

let debounceUpdate: any = () => {};

interface Props {
  changeSearch: (value: string) => void;
}

function AlertsSearch({ changeSearch }: Props) {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    debounceUpdate = debounce((value: string) => changeSearch(value), 500);
  }, []);

  const write = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(value);
    debounceUpdate(value);
  };

  return (
    <div className="relative">
      <Icon name="search" className="absolute top-0 bottom-0 ml-2 m-auto" size="16" />
      <input
        value={inputValue}
        name="alertsSearch"
        className="bg-white p-2 border border-borderColor-gray-light-shade rounded w-full pl-10"
        placeholder="Filter by title"
        onChange={write}
      />
    </div>
  );
}

export default connect(
  (state) => ({
    // @ts-ignore
    alertsSearch: state.getIn(['alerts', 'alertsSearch']),
  }),
  { changeSearch }
)(AlertsSearch);
