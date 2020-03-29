import {BlockType, Event, EventStatusType, EventType, isEventBlock, isEventHook, isEventNote, Reporter} from "../types";

export class VerboseReporter implements Reporter {

    private static eventTypeMap : { [key in EventType]: string } = {
        [EventType.SKIP] : '↷',
        [EventType.ENTER]: '⇒',
        [EventType.LEAVE]: '⇐',
        [EventType.NOTE]: '📝'
    };

    private static eventStatusTypeMap : { [key in EventStatusType]: string } = {
        [EventStatusType.SUCCESS]: '✓',
        [EventStatusType.TIMEOUT]: '⏰',
        [EventStatusType.ABORT]: '🛑',
        [EventStatusType.EXCEPTION]: '⚠',
        [EventStatusType.UNUSED]: '👻'
    };


    private readonly log : (message: string) => void | PromiseLike<void>;
    private readonly indent : boolean;

    constructor(options: { log? : (message: string) => void | PromiseLike<void>, indent?: boolean } = {}) {
        const { log, indent } = Object.assign(
            {
                log: console.log,
                indent: false
            },
            options
        );

        this.indent = indent;
        this.log = log;
    }

    async on(event: Event) {
        const eventTypeSymbol = VerboseReporter.eventTypeMap[event.eventType];
        const eventStatusTypeSymbol = VerboseReporter.eventStatusTypeMap[event.eventStatusType];

        let description = event.description ? `- ${event.description}` : '<anonymous>';

        if (isEventBlock(event)) {

        }
        if (isEventHook(event)) {
            description = `${description} (parent: ${event.context.parent.description}, creator: ${event.context.creator.description}, trigger: ${event.context.trigger.description})`;
        }
        else if (isEventNote(event)) {

        }

        console.log(`${eventTypeSymbol}${eventStatusTypeSymbol} ${event.blockType} ${description} ${event.exception ? ': ' + event.exception.message : ''}`);
    }
}