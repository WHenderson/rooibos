import {HookDepth} from "./hook-depth";
import {State} from "./state";

export interface TriggerState {
    depth: Exclude<HookDepth, HookDepth.ALL>;
    state: State;
}
