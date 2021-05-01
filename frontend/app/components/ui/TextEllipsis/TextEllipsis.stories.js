import { storiesOf } from '@storybook/react';
import TextEllipsis from '.';

storiesOf('TextEllipsis', module)
  .add('Pure', () => (
    <TextEllipsis />
  ))
  .add('Normal Text', () => (
    <TextEllipsis popupProps={{ wide: 'very'}}>
      {'this is test'}
    </TextEllipsis>
  ))
  .add('Inverted', () => (
    <TextEllipsis popupProps={{ wide: 'very', inverted: true }}>
      {'this is test'}
    </TextEllipsis>
  ))
  .add('Bigger Text', () => (
    <TextEllipsis popupProps={{ wide: 'very'}}>
      <div style={{width: '200px',  }}>{'this is the biggest text in the application to test the popup content. this is the biggest text in the application to test the popup content.'}</div>
    </TextEllipsis>
  ))

