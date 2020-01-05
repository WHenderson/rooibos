import { Context } from "./context";

export enum EventType {
    ENTER = 'ENTER',
    SKIP = 'SKIP',
    SUCCESS = 'SUCCESS',
    FAILURE = 'FAILURE',
    TIMEOUT = 'TIMEOUT',
    ABORT = 'ABORT',
    LEAVE = 'LEAVE'
}

export enum EntryType {
    describe = 'describe',
    test = 'test',
    before = 'before',
    beforeEach = 'beforeEach',
    afterEach = 'afterEach',
    after = 'after'
}

export interface Event {
    entry : EntryType,
    event : EventType,
    context : Context,
    exception : Error
}