"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../types");
class VerboseReporter {
    constructor(options = {}) {
        const { log, indent } = Object.assign({
            log: console.log,
            indent: false
        }, options);
        this.indent = indent;
        this.log = log;
    }
    async on(event) {
        const strIndent = this.indent ? (() => {
            let count = 0;
            let context = event.context.parent;
            while (context.parent) {
                ++count;
                context = context.parent;
            }
            return ''.padStart(count, ' ');
        })() : '';
        const blockItem = VerboseReporter.blockTypeMap.get(event.blockType) || { blockValue: event.blockType, eventTypeMap: new Map() };
        const strBlockType = blockItem.blockValue;
        const strEventType = blockItem.eventTypeMap.get(event.eventType) || event.eventType;
        const description = (event.eventType === types_1.EventType.NOTE ? (event.id + ' - ') : '') + event.description;
        const suffix = `${event.exception ? ': ' + event.exception.message : event.eventType === types_1.EventType.NOTE ? ': ' + JSON.stringify(event.value) : ''}`;
        await this.log(`${strIndent}${strEventType} ${strBlockType} - ${description}${suffix}`);
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
                [types_1.EventType.LEAVE_EXCEPTION, '⇍'],
                [types_1.EventType.LEAVE_TIMEOUT, '⇍'],
                [types_1.EventType.LEAVE_ABORT, '⇍'],
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
                [types_1.EventType.LEAVE_EXCEPTION, '⇍'],
                [types_1.EventType.LEAVE_TIMEOUT, '⇍'],
                [types_1.EventType.LEAVE_ABORT, '⇍'],
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
                [types_1.EventType.LEAVE_EXCEPTION, '⇍'],
                [types_1.EventType.LEAVE_TIMEOUT, '⇍'],
                [types_1.EventType.LEAVE_ABORT, '⇍'],
            ])
        }
    ]
]);
//# sourceMappingURL=VerboseReporter.js.map