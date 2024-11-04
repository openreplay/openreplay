import React from 'react';
import { Input, Button, Icon } from 'UI';
import styles from './blockedIps.module.css';

class BlockedIps extends React.PureComponent {
  render() {
    return (
      <div className={ styles.wrapper }>
        <h4>{ 'Block IP' }</h4>
        <div className={ styles.content }>
          <label>{ 'List of IPs or Subnets to be blocked.' }</label>
          <div className={ styles.inputWrapper }>
            <Input type="text" />
            <Button primary outline >{ 'Block' }</Button>
          </div>

          <div className={ styles.list }>
            <div className={ styles.item }>
              <div>{ '192.128.2.1' }</div>
              <div className={ styles.actions }>
                <Icon name="trash" size="14" color="gray-medium" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default BlockedIps;
