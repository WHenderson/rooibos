import {Reporter,EventType,Event} from "./Reporter";
import {log} from "../../test/_util/log";

export class VerboseReporter implements Reporter {
    public static symbolMap = new Map([
        [EventType.ENTER, '>'],
        [EventType.PENDING, '…'],
        [EventType.SUCCESS, '✓'],
        [EventType.FAILURE, '✗'],
        [EventType.SKIPPED, '↷'],
        [EventType.CANCELLED, '🚫'],
        [EventType.TIMEOUT, '⏰'],
        [EventType.ABORT, '🛑'],
        [EventType.LEAVE, '<']
    ]);

    private readonly log : (message: string) => void | PromiseLike<void>;

    constructor(log : (message: string) => void | PromiseLike<void> = console.log) {
        this.log = log;
    }

    async on(event: Event) {
        const symbol = VerboseReporter.symbolMap.get(event.type) || event.type;
        const tree = event.context.parents.map(p => p.name).join('/');
        this.log(`## ${tree} ${symbol} ${event.name} ${event.exception ? event.exception.message : ''}`)
    }
}