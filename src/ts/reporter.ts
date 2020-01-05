import {Event} from "./events";

export interface Reporter {
    on(event : Event) : Promise<void>;
}

