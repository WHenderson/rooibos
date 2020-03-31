import {HookContext} from "./hook-context";
import {EventBase} from "./event-base";
import {HookOptions} from "./hook-options";
import {BlockType} from "./block-type";

export interface EventHook extends EventBase {
    context: HookContext;

    hookOptions: HookOptions;
}

export function isEventHook(event: EventBase) : event is EventHook {
    return event.blockType === BlockType.HOOK;
}
