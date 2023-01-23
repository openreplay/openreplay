import React from 'react';
import { observer } from 'mobx-react-lite';
import cn from 'classnames';
import styles from './styles.module.css';
import Renderer from './Renderer';

function PlayerContent() {

  return (
    <div className="relative">
        <div className={'flex'}>
          <div
            className="w-full"
          >
            <div className={cn(styles.session, 'relative')}>
              <div
                className={cn(styles.playerBlock, 'flex flex-col', 'overflow-visible')}
                style={{ zIndex: 1, minWidth: '100%' }}
              >
                <Renderer />
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}


export default observer(PlayerContent);
