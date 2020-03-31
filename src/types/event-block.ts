import {ContextBlock} from "./context-block";
import {EventBase} from "./event-base";
import {BlockType} from "./block-type";

export interface EventBlock extends EventBase {
    context: ContextBlock;
}

export function isEventBlock(event: EventBase) : event is EventBlock {
    return event.blockType === BlockType.SCRIPT
        || event.blockType === BlockType.DESCRIBE
        || event.blockType === BlockType.IT;
}
