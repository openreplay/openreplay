"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tracker_1 = require("@openreplay/tracker/cjs");
function default_1() {
    return (app) => {
        if (app === null) {
            return (name) => (fn, thisArg) => thisArg === undefined ? fn : fn.bind(thisArg);
        }
        return (name) => (fn, thisArg) => (...args) => {
            const startTime = performance.now();
            const result = thisArg === undefined ? fn.apply(this, args) : fn.apply(thisArg, args);
            const duration = performance.now() - startTime;
            app.send(tracker_1.Messages.Profiler(name, duration, args.map(String).join(', '), String(result)));
            return result;
        };
    };
}
exports.default = default_1;
