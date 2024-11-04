import React from 'react';
import { ModalConsumer } from './';

export default (BaseComponent) =>
  React.memo((props) => (
    <ModalConsumer>{(value) => <BaseComponent {...value} {...props} />}</ModalConsumer>
  ));
