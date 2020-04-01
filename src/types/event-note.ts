import {Guid} from "guid-typescript";
import {EventBase} from "./event-base";
import {BlockType} from "./block-type";
import {JsonValue} from "./json";
import {ContextNote} from "./context-note";

export interface EventNote extends EventBase {
    context: ContextNote;

    id: Guid;
    value?: JsonValue;
}

export function isEventNote(event: EventBase) : event is EventNote {
    return event.blockType === BlockType.NOTE;
}
