import {ContextHook} from "./context-hook";
import {EventBase} from "./event-base";
import {BlockType} from "./block-type";
import {UserOptionsHook} from "./user-options-hook";

export interface EventHook extends EventBase {
    context: ContextHook;

    hookOptions: UserOptionsHook;
}

export function isEventHook(event: EventBase) : event is EventHook {
    return event.blockType === BlockType.HOOK;
}
