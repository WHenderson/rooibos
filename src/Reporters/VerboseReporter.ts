import {
    Context,
    ContextBlock,
    Event,
    EventStatusType,
    EventType,
    isEventBlock,
    isEventHook,
    isEventNote,
    Reporter
} from "../types";
import {ReporterBase} from "./ReporterBase";

export class VerboseReporter extends ReporterBase implements Reporter {

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
        super();

        const { log, indent } = Object.assign(
            {
                // tslint:disable-next-line:no-console
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

        let description = !event.context ? '<no context>' : !event.context.description ? '<anonymous>' : `- ${event.context.description}`;
        let blockType = `${event.blockType}`;

        let indent = 0;
        const findDepth = (context : Context) => {
            return context ? findDepth(context.parent) + 1 : 0;
        };

        if (isEventBlock(event)) {
            indent = findDepth(event.context);
        }
        if (isEventHook(event)) {
            const getDesc = (context : ContextBlock) => !context ? '<none>': !context.description ? '<anonymous>' : context.description;
            description = `${description} (parent: ${getDesc(event.context.parent)}, creator: ${getDesc(event.context.creator)}, trigger: ${getDesc(event.context.trigger)})`;

            blockType = `${blockType} ${event.hookOptions.when} ${event.hookOptions.depth}`;

            indent = findDepth(event.context.trigger);
        }
        if (isEventNote(event)) {
            if (event.eventType === EventType.NOTE || event.eventType === EventType.SKIP)
                description = `${description} ${event.value === undefined ? '<undefined>' : JSON.stringify(event.value)}`

            indent = findDepth(event.context);
        }

        this.log(`${this.indent ? ''.padStart(indent) : ''}${eventTypeSymbol}${eventStatusTypeSymbol} ${blockType} ${description} ${event.exception ? ': ' + event.exception.message : ''}`);
    }
}