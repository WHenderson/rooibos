import {Event, Reporter} from "../types";

export class JsonReporter implements Reporter {
    public readonly events : Event[];

    constructor() {
        this.events = [];
    }

    async on(event: Event) {
        this.events.push(Object.assign({}, event, { context: Object.assign({}, event.context) } ));
    }
}