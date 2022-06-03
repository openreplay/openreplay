import React from 'react';
import { connect } from 'react-redux';
import { Input, Button, Form } from 'UI';
import { addMessage } from 'Duck/assignments';

class IssueCommentForm extends React.PureComponent {
  state = { comment: '' }

  write = ({ target: { name, value } }) => this.setState({ comment: value });

  addComment = () => {
    const { comment } = this.state;
    const { sessionId, issueId, addMessage, loading } = this.props;
    if (loading) return;
    
    addMessage(sessionId, issueId, { message: comment, type: 'message' }).then(() => {
      this.setState({comment: ''});
    })
  }

  render() {
    const { comment } = this.state;
    const { loading } = this.props;

    return (
      <div className="p-6 bg-white">
        <h5 className="mb-1">Add Comment</h5>
        <Form onSubmit={ this.addComment }>
          <div className="flex mt-2 items-center">
            <Input
              onChange={ this.write }
              value={ comment }
              fluid
              placeholder="Type here"
              className="flex-1 mr-3"
            />
            <Button
              disabled={ comment.length === 0 }
              variant="primary"
              loading={ loading }>{'Comment'}</Button>
          </div>
        </Form>
      </div>
    );
  }
};

export default connect(state => ({
  loading: state.getIn(['assignments', 'addMessage', 'loading'])
}), { addMessage })(IssueCommentForm)
