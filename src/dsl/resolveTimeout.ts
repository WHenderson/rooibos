import {EnumEntry} from "./EntryType";
import {HookOptions, NodeOptions} from "./Options";

export function resolveTimeout(entryType: EnumEntry, options: NodeOptions | HookOptions) : number {
    let timeout;
    switch (entryType) {
        case EnumEntry.describe:
            timeout = (options as NodeOptions).timeoutDescribe;
            break;
        case EnumEntry.it:
            timeout = (options as NodeOptions).timeoutIt;
            break;
        case EnumEntry.before:
            timeout = (options as HookOptions).timeoutBefore;
            break;
        case EnumEntry.beforeEach:
            timeout = (options as HookOptions).timeoutBeforeEach;
            break;
        case EnumEntry.afterEach:
            timeout = (options as HookOptions).timeoutAfterEach;
            break;
        case EnumEntry.after:
            timeout = (options as HookOptions).timeoutAfter;
            break;
    }

    if (typeof timeout !== 'number') {
        switch (entryType) {
            case EnumEntry.it:
            case EnumEntry.describe:
                timeout = (options as NodeOptions).timeoutNode;
                break;
            case EnumEntry.before:
            case EnumEntry.beforeEach:
            case EnumEntry.afterEach:
            case EnumEntry.after:
                timeout = (options as HookOptions).timeoutHook;
                break;
        }
    }

    if (typeof timeout !== 'number')
        timeout = options.timeoutDefault;

    return timeout;
}