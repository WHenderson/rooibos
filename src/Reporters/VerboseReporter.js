"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Reporter_1 = require("./Reporter");
class VerboseReporter {
    constructor(log = console.log) {
        this.log = log;
    }
    async on(event) {
        const symbol = VerboseReporter.symbolMap.get(event.type) || event.type;
        const tree = event.context.parents.map(p => p.name).join('/');
        this.log(`## ${tree} ${symbol} ${event.name} ${event.exception ? event.exception.message : ''}`);
    }
}
exports.VerboseReporter = VerboseReporter;
VerboseReporter.symbolMap = new Map([
    [Reporter_1.EventType.ENTER, '>'],
    [Reporter_1.EventType.PENDING, '…'],
    [Reporter_1.EventType.SUCCESS, '✓'],
    [Reporter_1.EventType.FAILURE, '✗'],
    [Reporter_1.EventType.SKIPPED, '↷'],
    [Reporter_1.EventType.CANCELLED, '🚫'],
    [Reporter_1.EventType.TIMEOUT, '⏰'],
    [Reporter_1.EventType.ABORT, '🛑'],
    [Reporter_1.EventType.LEAVE, '<']
]);
//# sourceMappingURL=VerboseReporter.js.map