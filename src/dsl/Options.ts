// User callback for an entry type
import {Context} from "./Context";
import {EnumHookEntry, EnumNodeEntry} from "./EntryType";

export type Callback = (this: Context, context: Context) => void | PromiseLike<void>;

// Node options
export interface NodeOptions {
    only?: boolean;
    skip?: boolean;

    timeoutDefault?: number;
    timeoutNode?: number;
    timeoutDescribe?: number;
    timeoutIt?: number;
    timeoutHook?: number;
    timeoutBefore?: number;
    timeoutBeforeEach?: number;
    timeoutAfterEach?: number;
    timeoutAfter?: number;

    safeAbort?: boolean;
}

export const EnumNodeOptionsInheritable = [
    'timeoutDefault',
    'timeoutNode',
    'timeoutDescribe',
    'timeoutIt',
    'timeoutHook',
    'timeoutBefore',
    'timeoutBeforeEach',
    'timeoutAfterEach',
    'timeoutAfter',
    'safeAbort',
    'only',
    'skip'
];

// Hook options
export interface HookOptions {
    localOnly?: boolean;
    nodeType?: EnumNodeEntry;

    timeoutDefault?: number;
    timeoutHook?: number;
    timeoutBefore?: number;
    timeoutBeforeEach?: number;
    timeoutAfterEach?: number;
    timeoutAfter?: number;

    safeAbort?: boolean;
}

export const EnumHookOptionsInheritable = [
    'localOnly',
    'timeoutDefault',
    'timeoutHook',
    'timeoutBefore',
    'timeoutBeforeEach',
    'timeoutAfterEach',
    'timeoutAfter',
    'safeAbort'
];

// Internal Node options
export interface NodeOptionsNamed extends NodeOptions {
    name: string;
    nodeType: EnumNodeEntry;
    callback: Callback;
}

// Internal Hook options
export interface HookOptionsNamed extends HookOptions {
    name: string;
    hookType: EnumHookEntry;
    callback: Callback;
    callCount: number;
}