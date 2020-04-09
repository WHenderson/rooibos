import {Event, Reporter} from "../types";

export class ReporterBase implements Reporter {
    async on(event: Event) {
        throw new Error('Not Implemented');
    }
}