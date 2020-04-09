import {Event, Reporter} from "../types";
import {ReporterBase} from "./ReporterBase";

export class PipeReporter extends ReporterBase implements Reporter {
    private readonly reporters : Reporter[];

    constructor(reporters: Reporter[]) {
        super();
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