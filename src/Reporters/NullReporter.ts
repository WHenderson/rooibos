import {Event, Reporter} from "../types";
import {ReporterBase} from "./ReporterBase";

export class NullReporter extends ReporterBase implements Reporter {
    async on(event: Event) {
        // Discard events
    }
}