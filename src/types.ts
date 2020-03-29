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
    BEFORE_ONCE = 'beforeOnce',
    AFTER_ONCE = 'afterOnce'
}

export enum HookEachWhen {
    BEFORE_EACH = 'beforeEach',
    AFTER_EACH = 'afterEach'
}

export const HookWhen = { ...HookOnceWhen, ...HookEachWhen };
export type HookWhen = HookOnceWhen | HookEachWhen;

export function isHookOnce(when: HookWhen): when is HookOnceWhen {
    return Object.values(HookOnceWhen).includes(when as HookOnceWhen);
}
export function isHookEach(when: HookWhen): when is HookEachWhen {
    return Object.values(HookEachWhen).includes(when as HookEachWhen);
}
export function isHookBefore(when: HookWhen) : boolean {
    return when === HookEachWhen.BEFORE_EACH || when === HookOnceWhen.BEFORE_ONCE;
}
export function isHookAfter(when: HookWhen) : boolean {
    return when === HookEachWhen.AFTER_EACH || when === HookOnceWhen.AFTER_ONCE;
}

export enum HookDepth {
    SHALLOW = 'shallow',
    DEEP = 'deep',
    ALL = 'all'
}

export type HookCallback = (context: HookContext) => void | PromiseLike<void>;

export interface HookOptions {
    blockTypes: BlockType[];
    when: HookWhen;
    depth: HookDepth;
    timeout: number;
}

export interface HookDetails extends HookOptions {
    description: string;
    callback: HookCallback;
    executed: boolean;
}

export interface HookContextDetails {
    hook: HookDetails;
    creationState: State;
}

export enum EventType {
    SKIP = 'skip',

    ENTER = 'enter',
    LEAVE = 'leave',

    NOTE = 'note'
}

export enum EventStatusType {
    SUCCESS = 'success',
    TIMEOUT = 'timeout',
    ABORT = 'abort',
    EXCEPTION = 'exception',
    UNUSED = 'unused'
}

export interface EventBase {
    blockType: BlockType;
    eventType: EventType;
    eventStatusType: EventStatusType;
    exception?: Error;
    description: string;
}

export interface EventBlock extends EventBase {
    context: Context;
}

export function isEventBlock(event: EventBase) : event is EventBlock {
    return event.blockType === BlockType.SCRIPT
    || event.blockType === BlockType.DESCRIBE
    || event.blockType === BlockType.IT;
}

export interface EventHook extends EventBase {
    context: HookContext;

    hookOptions: HookOptions;
}

export function isEventHook(event: EventBase) : event is EventHook {
    return event.blockType === BlockType.HOOK;
}

export interface EventNote extends EventBlock {
    id: Guid;
    value: JsonValue;
    context: Context | HookContext;
}

export function isEventNote(event: EventBase) : event is EventNote {
    return event.blockType === BlockType.NOTE;
}

export type Event = EventBlock | EventHook | EventNote;

export interface Context {
    blockType: BlockType;
    description: string;
    parent: Context;
    data: object;
    aapi: AbortApi;
}

export interface HookContext extends Context {
    creator: Context;
    trigger: Context;
}

export type Callback = (context: Context) => void | PromiseLike<void>;

export interface TriggerState {
    depth: Exclude<HookDepth, HookDepth.ALL>;
    state: State;
}

export interface State {
    blockType: BlockType;
    promise: Promise<void>;
    hooks: HookDetails[];
    context: Context | HookContext;
    aapi: AbortApi;
    parentState: State;
    triggers: TriggerState[];
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