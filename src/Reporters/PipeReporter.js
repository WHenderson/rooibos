"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class PipeReporter {
    constructor(reporters) {
        this.reporters = reporters;
    }
    async on(event) {
        await this.reporters.reduce(async (acc, cur) => {
            await acc;
            await cur.on(event);
        }, Promise.resolve());
    }
}
exports.PipeReporter = PipeReporter;
//# sourceMappingURL=PipeReporter.js.map