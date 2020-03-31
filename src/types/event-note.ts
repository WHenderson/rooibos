import {Guid} from "guid-typescript";
import {EventBlock} from "./event-block";
import {EventBase} from "./event-base";
import {BlockType} from "./block-type";
import {JsonValue} from "./json";
import {Context} from "./context";
import {HookContext} from "./hook-context";

export interface EventNote extends EventBlock {
    id: Guid;
    value: JsonValue;
    context: Context | HookContext;
}

export function isEventNote(event: EventBase) : event is EventNote {
    return event.blockType === BlockType.NOTE;
}
