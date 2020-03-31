import {Guid} from "guid-typescript";
import {EventBlock} from "./event-block";
import {EventBase} from "./event-base";
import {BlockType} from "./block-type";
import {JsonValue} from "./json";
import {ContextBlock} from "./context-block";
import {ContextHook} from "./context-hook";

export interface EventNote extends EventBlock {
    id: Guid;
    value: JsonValue;
    context: ContextBlock | ContextHook;
}

export function isEventNote(event: EventBase) : event is EventNote {
    return event.blockType === BlockType.NOTE;
}
