import {Reporter,EventType,Event} from "./Reporter";

export class JsonReporter implements Reporter {
    public readonly events : Event[];

    constructor() {
        this.events = [];
    }

    async on(event: Event) {
        this.events.push(Object.assign({}, event ));
    }
}