import {Context, EnumEntry} from "../dsl";

export enum EventType {
    ENTER = 'ENTER',
    PENDING = 'PENDING', // Item has been aborted, but is still running
    SUCCESS = 'SUCCESS',
    FAILURE = 'FAILURE', // User code threw an exception
    SKIPPED = 'SKIPPED', // User requested the item be skipped
    CANCELLED = 'CANCELLED', // Previous item was aborted or timed out, causing this item to be skipped. Only applies to hooks
    TIMEOUT = 'TIMEOUT', // Item took too long
    ABORT = 'ABORT', // Item was aborted (likely because of a parent timeout)
    LEAVE = 'LEAVE'
}

export interface Event {
    name : string,
    entry : EnumEntry,
    type : EventType,
    context : Context,
    exception? : Error
}

export interface Reporter {
    on(event : Event) : Promise<unknown>;
}