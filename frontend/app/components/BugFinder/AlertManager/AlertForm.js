import React from 'react';
import { Input, Dropdown, Button } from 'UI';
import styles from './alertForm.css';

const periodOptions = [
  {
    text: '1 Week',
    value: 'week',
  },
  {
    text: '1 Month',
    value: 'month',
  },
];

const AlertForm = ({
  alert, write, onSave, loading, onCancel = null,
}) => (
  <div>
    <div className={ styles.formGroup }>
      <h3 className={ styles.label }>{'Title'}</h3>
      <Input
        name="name"
        value={ alert.name }
        onChange={ write }
        fluid
        placeholder="Name your alert"
      />
    </div>

    <div className={ styles.formGroup }>
      <h3 className={ styles.label }>{'Threshold'}</h3>
      <Input
        type="number"
        name="countThreshold"
        value={ alert.countThreshold }
        fluid
        onChange={ write }
        placeholder="E.g. 20"
      />
    </div>

    <div className={ styles.formGroup }>
      <h3 className={ styles.label }>{'For Next'}</h3>
      <Dropdown
        name="period"
        options={ periodOptions }
        value={ alert.period }
        fluid
        onChange={ write }
      />
    </div>

    <Button
      loading={ loading }
      onClick={ onSave }
      content={ alert.id ? 'Update' : 'Set Alert' }
      outline
      disabled={ !alert.validate() }
      marginRight
    />

    { onCancel &&
      <Button
        onClick={ onCancel }
        content="Cancel"
        outline
      />
    }
  </div>
);

export default AlertForm;
