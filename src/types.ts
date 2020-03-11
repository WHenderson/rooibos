import { AbortApi, AbortApiInternal, Abortable } from 'advanced-promises';

export enum BlockType {
    SCRIPT= 'script',
    DESCRIBE = 'describe',
    IT = 'it',
    NOTE = 'note',
    HOOK = 'hook'
}

export enum HookType {
    TARGET_NEITHER = 0,
    TARGET_DESCRIBE = 1,
    TARGET_IT = 2,
    TARGET_BOTH = TARGET_DESCRIBE | TARGET_IT,

    WHEN_NEITHER = 0,
    WHEN_BEFORE = 4,
    WHEN_AFTER = 8,
    WHEN_BOTH = WHEN_BEFORE | WHEN_AFTER,

    NEST_NEITHER = 0,
    NEST_SHALLOW = 16,
    NEST_DEEP = 32,
    NEST_BOTH = NEST_SHALLOW | NEST_DEEP
}

export enum EventType {
    SKIP = 'skip',
    NOTE = 'note',
    ENTER = 'enter',
    TIMEOUT = 'timeout',
    ABORT = 'abort',
    EXCEPTION = 'exception',
    LEAVE_SUCCESS = 'leave-success',
    LEAVE_EXCEPTION = 'leave-exception',
    LEAVE_TIMEOUT = 'leave-timeout',
    LEAVE_ABORT = 'leave-abort'
}

export interface Event {
    blockType: BlockType;
    eventType: EventType;
    context: Context;
    exception?: Error;

    hookType?: HookType;
    hookCreationContext?: Context; // context where the hook was generated
}

export interface Context {
    readonly blockType: BlockType;
    readonly description: string;
    readonly parent: Context;
    readonly data: object;
    readonly aapi: AbortApi;
}

export type Callback = (context: Context) => void | PromiseLike<void>;

export interface Hook {
    hookType: HookType;
    callback: Callback;
}

export interface Stack {
    promise: Promise<void>;
    hooks: Hook[];
    context: Context;
    aapi: AbortApi;
}

export interface Reporter {
    on(event : Event) : Promise<void>;
}
