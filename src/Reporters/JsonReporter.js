"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class JsonReporter {
    constructor() {
        this.events = [];
    }
    async on(event) {
        this.events.push(Object.assign({}, event));
    }
}
exports.JsonReporter = JsonReporter;
//# sourceMappingURL=JsonReporter.js.map