import { AbortApi, AbortApiInternal, Abortable } from 'advanced-promises';
import {Guid} from "guid-typescript";

export enum BlockType {
    SCRIPT = 'script',
    DESCRIBE = 'describe',
    IT = 'it',
    NOTE = 'note',
    HOOK = 'hook'
}

export enum HookOnceWhen {
    BEFORE = 'before',
    AFTER = 'after',
    BEFORE_AND_AFTER = 'before&after',
}

export enum HookEachWhen {
    BEFORE_EACH = 'beforeEach',
    AFTER_EACH = 'afterEach',
    BEFORE_AND_AFTER_EACH = 'beforeEach&afterEach'
}

export const HookWhen = { ...HookOnceWhen, ...HookEachWhen };
export type HookWhen = HookOnceWhen | HookEachWhen;

export function isHookOnce(when: HookWhen): when is HookOnceWhen {
    return Object.values(HookOnceWhen).includes(when as HookOnceWhen);
}
export function isHookEach(when: HookWhen): when is HookEachWhen {
    return Object.values(HookEachWhen).includes(when as HookEachWhen);
}


export enum HookDepth {
    SHALLOW = 'shallow',
    DEEP = 'deep',
    ALL = 'all'
}

export interface HookOptions {
    description: string;
    blockTypes: BlockType[];
    when: HookWhen;
    depth: HookDepth;
    timeout: number;
}

export interface HookContextOptions extends HookOptions {
    creationContext: Context;
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
    description: string;
    blockType: BlockType;
    eventType: EventType;
    context: Context;
    exception?: Error;

    // valid during a hook
    hookOptions?: HookContextOptions;

    // Valid during a note
    id?: Guid;
    value?: JsonValue;
}

export interface Context {
    readonly blockType: BlockType;
    readonly description: string;
    readonly parent: Context;
    readonly data: object;
    readonly aapi: AbortApi;
}

export type Callback = (context: Context) => void | PromiseLike<void>;

export interface Hook extends HookContextOptions {
    readonly callback: Callback;
}

export interface Stack {
    promise: Promise<void>;
    hooks: Hook[];
    context: Context;
    aapi: AbortApi;
    parent: Stack;
}

export interface Reporter {
    on(event : Event) : Promise<void>;
}

export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];
export type JsonPrimitive =
    | null
    | boolean
    | number
    | string;
export type JsonValue =
    | JsonPrimitive
    | JsonArray
    | JsonObject;