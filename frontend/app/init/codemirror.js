import { JSHINT } from 'jshint';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/addon/lint/lint';
import 'codemirror/addon/lint/javascript-lint';

window.JSHINT = JSHINT;

// Init with no errors
JSHINT('');
