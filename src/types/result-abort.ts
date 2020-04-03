import {EventStatusType} from "./event-status-type";

export interface ResultAbort {
    status: EventStatusType;
    exception?: Error;
}