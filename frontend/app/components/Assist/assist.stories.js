import { storiesOf } from '@storybook/react';
import ChatWindow from './ChatWindow';

storiesOf('Assist', module)
  .add('ChatWindow', () => (
    <ChatWindow userId="test@test.com" />
  ))

