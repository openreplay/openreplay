import { connect } from 'react-redux';
import { Dropdown } from 'semantic-ui-react';
import { IconButton } from 'UI';
import { sort } from 'Duck/sessions';
import { applyFilter } from 'Duck/filters';

const sessionSortOptions = {
//   '': 'All',
  'open': 'Open',
  'closed': 'Closed',
};

const sortOptions = Object.entries(sessionSortOptions)
  .map(([ value, text ]) => ({ value, text }));

const IssuesSortDropdown = ({ onChange, value }) => {
    // sort = (e, { value }) => {
    //     const [ sort, order ] = value.split('-');
    //     const sign = order === 'desc' ? -1 : 1;
    //     this.props.applyFilter({ order, sort });

    //     this.props.sort(sort, sign)
    //     setTimeout(() => this.props.sort(sort, sign), 3000);
    // }

    return (
        <Dropdown
            name="issueType"
            value={ value  || sortOptions[ 0 ].value}
            trigger={
                <IconButton
                    // outline
                    label=""
                    icon="filter"
                    size="medium"
                    // shadow
                    className="outline-none"
                />
            }
            pointing="top right"
            options={ sortOptions }
            onChange={ onChange }
            // defaultValue={ sortOptions[ 0 ].value }
            icon={ null }
        />
    );
}

export default IssuesSortDropdown;
