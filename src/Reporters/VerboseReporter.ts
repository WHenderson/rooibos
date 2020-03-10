import {BlockType, Event, EventType, Reporter} from "../types";

export interface BlockItem {
    blockValue: string;
    eventTypeMap: Map<EventType, string>;
}

export class VerboseReporter implements Reporter {

    public static blockTypeMap = new Map<BlockType, BlockItem>([
        [
            BlockType.SCRIPT,
            {
                blockValue: 'script',
                eventTypeMap: new Map<EventType, string>([
                    [EventType.SKIP, '↷'],
                    [EventType.ENTER, '⇒'],
                    [EventType.TIMEOUT, '⏰'],
                    [EventType.ABORT, '🛑'],
                    [EventType.EXCEPTION, '⚠'],
                    [EventType.LEAVE_SUCCESS, '⇐'],
                    [EventType.LEAVE_EXCEPTION, '⇐'],
                    [EventType.LEAVE_TIMEOUT, '⇐'],
                    [EventType.LEAVE_ABORT, '⇐'],
                ])
            }
        ],
        [
            BlockType.DESCRIBE,
            {
                blockValue: 'describe',
                eventTypeMap: new Map<EventType, string>([
                    [EventType.SKIP, '↷'],
                    [EventType.ENTER, '⇒'],
                    [EventType.TIMEOUT, '⏰'],
                    [EventType.ABORT, '🛑'],
                    [EventType.EXCEPTION, '⚠'],
                    [EventType.LEAVE_SUCCESS, '⇐'],
                    [EventType.LEAVE_EXCEPTION, '⇐'],
                    [EventType.LEAVE_TIMEOUT, '⇐'],
                    [EventType.LEAVE_ABORT, '⇐'],
                ])
            }
        ],
        [
            BlockType.IT,
            {
                blockValue: 'it',
                eventTypeMap: new Map<EventType, string>([
                    [EventType.SKIP, '↷'],
                    [EventType.ENTER, '⎆'],
                    [EventType.TIMEOUT, '⏰'],
                    [EventType.ABORT, '🛑'],
                    [EventType.EXCEPTION, '⚠'],
                    [EventType.LEAVE_SUCCESS, '✓'],
                    [EventType.LEAVE_EXCEPTION, '✗'],
                    [EventType.LEAVE_TIMEOUT, '✗'],
                    [EventType.LEAVE_ABORT, '✗'],
                ])
            }
        ],
        [
            BlockType.NOTE,
            {
                blockValue: 'note',
                eventTypeMap: new Map<EventType, string>([
                    [EventType.NOTE, '📝']
                ])
            }
        ],
        [
            BlockType.HOOK,
            {
                blockValue: 'hook',
                eventTypeMap: new Map<EventType, string>([
                    [EventType.SKIP, '↷'],
                    [EventType.ENTER, '⇒'],
                    [EventType.TIMEOUT, '⏰'],
                    [EventType.ABORT, '🛑'],
                    [EventType.EXCEPTION, '⚠'],
                    [EventType.LEAVE_SUCCESS, '⇐'],
                    [EventType.LEAVE_EXCEPTION, '⇐'],
                    [EventType.LEAVE_TIMEOUT, '⇐'],
                    [EventType.LEAVE_ABORT, '⇐'],
                ])
            }
        ]
    ]);

    private readonly log : (message: string) => void | PromiseLike<void>;

    constructor(log : (message: string) => void | PromiseLike<void> = console.log) {
        this.log = log;
    }

    async on(event: Event) {
        const blockItem = VerboseReporter.blockTypeMap.get(event.blockType) || { blockValue: event.blockType, eventTypeMap: new Map()};
        const strBlockType = blockItem.blockValue;
        const strEventType = blockItem.eventTypeMap.get(event.eventType) || event.eventType;
        const description = event.context.description;
        const exception = event.exception && event.exception.message;
        await this.log(`${strEventType} ${strBlockType} - ${description}${exception ? ` : ${exception}` : ''}`);
    }
}