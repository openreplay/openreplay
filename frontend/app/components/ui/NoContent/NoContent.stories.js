import { storiesOf } from '@storybook/react';
import NoContent from '.';

storiesOf('NoContent', module)
  .add('Pure', () => (
    <NoContent />
  ))
  .add('Text and icon', () => (
    <NoContent icon subtext="this is subtext to be displayed."/>
  ))
  .add('Empty Content', () => (
    <NoContent empty icon subtext="this is subtext to be displayed."/>
  ))

