import {HookDetails} from "./hook-details";
import {State} from "./state";

export interface HookContextDetails {
    hook: HookDetails;
    creationState: State;
}
