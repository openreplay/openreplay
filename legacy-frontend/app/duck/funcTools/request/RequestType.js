export default class RequestType extends String {
	get request() {
		return `${ this }_REQUEST`;
	}
	get success() {
		return `${ this }_SUCCESS`;
	}
	get failure() {
		return `${ this }_FAILURE`;
	}
	get array() {
		return [ this.request, this.success, this.failure ];
	}
}