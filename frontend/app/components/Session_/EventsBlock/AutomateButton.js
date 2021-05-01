import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { Loader } from 'semantic-ui-react';
import { connectPlayer } from 'Player';
import { testBuilderNew as testBuilderNewRoute } from 'App/routes';
import { generateTest } from 'Duck/tests';
import { FRAMEWORKS } from 'App/constants';
import styles from './automateButton.css';

@withRouter
@connectPlayer(state => ({
  playing: state.playing,
}))
@connect((state, props) => ({
  genTestId: state.getIn([ 'tests', 'instance', 'id' ]),
  loading: state.getIn([ 'tests', 'genTestRequest', 'loading' ]),
  disabled: props.playing ||
    state.getIn([ 'events', 'selected' ]).size < 2,
  selectedEvents: state.getIn([ 'events', 'selected' ]),
  sessionId: state.getIn([ 'sessions', 'current', 'sessionId' ]),
}), {
  generateTest,
})
export default class AutomateButton extends React.PureComponent {
  generateTest = (framework) => {
    const steps = this.props.selectedEvents
      .toList()
      .sort((e1, e2) => e1.timestamp - e2.timestamp)
      .toJS();

    this.props.generateTest(this.props.sessionId, {
      steps,
      // framework,
    })
      .then(() => this.props.history.push(testBuilderNewRoute()));
  }

  generateSeleniumTest = () => this.generateTest(FRAMEWORKS.SELENIUM)
  // generateCypressTest = () => this.generateTest(FRAMEWORKS.CYPRESS)

  render() {
    const { loading, disabled } = this.props;
    return (
      <div className={ styles.automateBtnWrapper } data-disabled={ disabled }>
        <div className={ styles.automateButton }>
          <a onClick={ this.generateSeleniumTest }>
            <Loader active={ loading } inline />
            <div className={ styles.mainText }>{ 'Automate' }</div>
            <div className={ styles.subText }>{'Select at Least 2 Events'}</div>
          </a>
        </div>
      </div>
    );
  }
}
