import BottomBlock from './BottomBlock';
import Content from './Content';
import Header from './Header';

BottomBlock.Header = Header;
BottomBlock.Content = Content;

export default BottomBlock as typeof BottomBlock & {
  Header: typeof Header;
  Content: typeof Content;
};
