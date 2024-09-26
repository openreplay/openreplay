export var RequestState;
(function (RequestState) {
    RequestState[RequestState["UNSENT"] = 0] = "UNSENT";
    RequestState[RequestState["OPENED"] = 1] = "OPENED";
    RequestState[RequestState["HEADERS_RECEIVED"] = 2] = "HEADERS_RECEIVED";
    RequestState[RequestState["LOADING"] = 3] = "LOADING";
    RequestState[RequestState["DONE"] = 4] = "DONE";
})(RequestState || (RequestState = {}));
//# sourceMappingURL=types.js.map