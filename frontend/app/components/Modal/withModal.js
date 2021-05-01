import { ModalConsumer } from './ModalContext';


export default BaseComponent => React.memo(props => (
	<ModalConsumer>
	  { value => <BaseComponent { ...value } { ...props } /> }
	</ModalConsumer>
));