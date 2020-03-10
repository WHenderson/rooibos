import {Event, Reporter} from "../types";

export class NullReporter implements Reporter {
    async on(event: Event) {
        // Discard events
    }
}