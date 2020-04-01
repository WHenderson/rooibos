import {BlockType} from "./block-type";
import {EventType} from "./event-type";
import {EventStatusType} from "./event-status-type";

export interface EventBase {
    blockType: BlockType;
    eventType: EventType;
    eventStatusType: EventStatusType;
    exception?: Error;
}
