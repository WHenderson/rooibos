import {Event, Reporter} from "../types";

export class PipeReporter implements Reporter {
    private readonly reporters : Reporter[];

    constructor(reporters: Reporter[]) {
        this.reporters = reporters;
    }

    async on(event: Event) {
        await this.reporters.reduce(
            async (acc, cur) => {
                await acc;
                await cur.on(event);
            },
            Promise.resolve()
        )
    }
}