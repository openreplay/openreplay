import { Controlled as CodeMirror } from 'react-codemirror2';

class CodeEditor extends React.PureComponent {
  onBeforeChange = (editor, data, value) => {
    if (typeof this.props.onChange === 'function') {
      this.props.onChange(data, { value, name: this.props.name });
    }
  }

  render() {
    const { lineNumbers = false, onChange, disabled = false, ...props } = this.props;
    return ( 
      <CodeMirror
        options={ {
          mode: 'javascript',
          theme: 'yeti',
          lineNumbers,
          lint: { esversion: 9 },
          gutters: [ 'CodeMirror-lint-markers' ],
          readOnly: disabled,
        } }
        disabled="true"
        onBeforeChange={ this.onBeforeChange }
        { ...props }
      />
    );
  }
}

CodeEditor.displayName = "CodeEditor";

export default CodeEditor;