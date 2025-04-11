import BottomBlock from './BottomBlock';
import Header from './Header';
import Content from './Content';

// @ts-ignore
BottomBlock.Header = Header;
// @ts-ignore
BottomBlock.Content = Content;

export default BottomBlock as typeof BottomBlock & {
  Header: typeof Header;
  Content: typeof Content;
};
