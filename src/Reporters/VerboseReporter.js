"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../types");
class VerboseReporter {
    constructor(log = console.log) {
        this.log = log;
    }
    async on(event) {
        const blockItem = VerboseReporter.blockTypeMap.get(event.blockType) || { blockValue: event.blockType, eventTypeMap: new Map() };
        const strBlockType = blockItem.blockValue;
        const strEventType = blockItem.eventTypeMap.get(event.eventType) || event.eventType;
        const description = event.context.description;
        const exception = event.exception && event.exception.message;
        await this.log(`${strEventType} ${strBlockType} - ${description}${exception ? ` : ${exception}` : ''}`);
    }
}
exports.VerboseReporter = VerboseReporter;
VerboseReporter.blockTypeMap = new Map([
    [
        types_1.BlockType.SCRIPT,
        {
            blockValue: 'script',
            eventTypeMap: new Map([
                [types_1.EventType.SKIP, '↷'],
                [types_1.EventType.ENTER, '⇒'],
                [types_1.EventType.TIMEOUT, '⏰'],
                [types_1.EventType.ABORT, '🛑'],
                [types_1.EventType.EXCEPTION, '⚠'],
                [types_1.EventType.LEAVE_SUCCESS, '⇐'],
                [types_1.EventType.LEAVE_EXCEPTION, '⇐'],
                [types_1.EventType.LEAVE_TIMEOUT, '⇐'],
                [types_1.EventType.LEAVE_ABORT, '⇐'],
            ])
        }
    ],
    [
        types_1.BlockType.DESCRIBE,
        {
            blockValue: 'describe',
            eventTypeMap: new Map([
                [types_1.EventType.SKIP, '↷'],
                [types_1.EventType.ENTER, '⇒'],
                [types_1.EventType.TIMEOUT, '⏰'],
                [types_1.EventType.ABORT, '🛑'],
                [types_1.EventType.EXCEPTION, '⚠'],
                [types_1.EventType.LEAVE_SUCCESS, '⇐'],
                [types_1.EventType.LEAVE_EXCEPTION, '⇐'],
                [types_1.EventType.LEAVE_TIMEOUT, '⇐'],
                [types_1.EventType.LEAVE_ABORT, '⇐'],
            ])
        }
    ],
    [
        types_1.BlockType.IT,
        {
            blockValue: 'it',
            eventTypeMap: new Map([
                [types_1.EventType.SKIP, '↷'],
                [types_1.EventType.ENTER, '⎆'],
                [types_1.EventType.TIMEOUT, '⏰'],
                [types_1.EventType.ABORT, '🛑'],
                [types_1.EventType.EXCEPTION, '⚠'],
                [types_1.EventType.LEAVE_SUCCESS, '✓'],
                [types_1.EventType.LEAVE_EXCEPTION, '✗'],
                [types_1.EventType.LEAVE_TIMEOUT, '✗'],
                [types_1.EventType.LEAVE_ABORT, '✗'],
            ])
        }
    ],
    [
        types_1.BlockType.NOTE,
        {
            blockValue: 'note',
            eventTypeMap: new Map([
                [types_1.EventType.NOTE, '📝']
            ])
        }
    ],
    [
        types_1.BlockType.HOOK,
        {
            blockValue: 'hook',
            eventTypeMap: new Map([
                [types_1.EventType.SKIP, '↷'],
                [types_1.EventType.ENTER, '⇒'],
                [types_1.EventType.TIMEOUT, '⏰'],
                [types_1.EventType.ABORT, '🛑'],
                [types_1.EventType.EXCEPTION, '⚠'],
                [types_1.EventType.LEAVE_SUCCESS, '⇐'],
                [types_1.EventType.LEAVE_EXCEPTION, '⇐'],
                [types_1.EventType.LEAVE_TIMEOUT, '⇐'],
                [types_1.EventType.LEAVE_ABORT, '⇐'],
            ])
        }
    ]
]);
//# sourceMappingURL=VerboseReporter.js.map