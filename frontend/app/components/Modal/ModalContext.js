const ModalContext = React.createContext({
  component: null,
  props: {},
  content: null,
  showModal: () => {},
  hideModal: () => {}
});

export class ModalProvider extends React.PureComponent {
  showModal = (component, props = {}) => {
    this.setState({
      component,
      props
    });
  };

  hideModal = () => this.setState({
    component: null,
    props: {},
  });

  state = {
    component: null,
    props: {},
    showModal: this.showModal,
    hideModal: this.hideModal
  };

  render() {
    return (
      <ModalContext.Provider value={this.state}>
        {this.props.children}
      </ModalContext.Provider>
    );
  }
}

export const ModalConsumer = ModalContext.Consumer;
