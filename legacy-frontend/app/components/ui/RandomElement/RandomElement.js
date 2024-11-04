import React from 'react';

let interval = null;
class RandomElement extends React.Component {
  state = { currentIndex: 0 }

  getRandomNumber = () => {
    return Math.floor(Math.random() * this.props.list.length)
  }

  componentDidMount() {
    const { list } = this.props;
    if (list && list.length > 0) {
      interval = setInterval(function() {
        this.setState({ currentIndex: this.getRandomNumber() })
      }.bind(this), 2000);
    }
  }

  componentWillUnmount() {
    clearInterval(interval)
  }

  render() {
    const { list, onClick } = this.props;
    const { currentIndex } = this.state;
    if (currentIndex < 0) return '';
    
    const currentItem = list[currentIndex];
    if (!currentItem) return '';

    return (
      <React.Fragment>
        { currentItem.element }
      </React.Fragment>
    );
  }
}

export default RandomElement;
