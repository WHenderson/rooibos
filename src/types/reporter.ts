import {Event} from "./event";

export interface Reporter {
    on(event : Event) : Promise<void>;
}
