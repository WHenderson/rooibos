"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EntryType_1 = require("./EntryType");
function resolveTimeout(entryType, options) {
    let timeout;
    switch (entryType) {
        case EntryType_1.EnumEntry.describe:
            timeout = options.timeoutDescribe;
            break;
        case EntryType_1.EnumEntry.it:
            timeout = options.timeoutIt;
            break;
        case EntryType_1.EnumEntry.before:
            timeout = options.timeoutBefore;
            break;
        case EntryType_1.EnumEntry.beforeEach:
            timeout = options.timeoutBeforeEach;
            break;
        case EntryType_1.EnumEntry.afterEach:
            timeout = options.timeoutAfterEach;
            break;
        case EntryType_1.EnumEntry.after:
            timeout = options.timeoutAfter;
            break;
    }
    if (typeof timeout !== 'number') {
        switch (entryType) {
            case EntryType_1.EnumEntry.it:
            case EntryType_1.EnumEntry.describe:
                timeout = options.timeoutNode;
                break;
            case EntryType_1.EnumEntry.before:
            case EntryType_1.EnumEntry.beforeEach:
            case EntryType_1.EnumEntry.afterEach:
            case EntryType_1.EnumEntry.after:
                timeout = options.timeoutHook;
                break;
        }
    }
    if (typeof timeout !== 'number')
        timeout = options.timeoutDefault;
    return timeout;
}
exports.resolveTimeout = resolveTimeout;
//# sourceMappingURL=resolveTimeout.js.map