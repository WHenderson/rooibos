import { Context } from "./context";

export enum EventType {
    ENTER = 'ENTER',
    SKIP = 'SKIP',
    PENDING = 'PENDING',
    SUCCESS = 'SUCCESS',
    FAILURE = 'FAILURE',
    TIMEOUT = 'TIMEOUT',
    ABORT = 'ABORT',
    LEAVE = 'LEAVE'
}

export enum NodeType {
    describe = 'describe',
    test = 'test'
}

export enum HookType {
    before = 'before',
    beforeEach = 'beforeEach',
    afterEach = 'afterEach',
    after = 'after'
}

export type EntryType = NodeType | HookType;
export const EntryType = { ...NodeType, ...HookType };

export interface Event {
    name : string,
    entry : EntryType,
    event : EventType,
    context : Context,
    exception? : Error
}