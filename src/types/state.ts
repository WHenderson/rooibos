import {AbortApi, Deconstructed} from 'advanced-promises';
import {BlockType} from "./block-type";
import {HookSettings} from "./hook-settings";
import {TriggerState} from "./trigger-state";
import {Context} from "./context";

export interface State {
    blockType: BlockType;
    promise: Promise<void>;
    promiseAfter?: {
        start: Deconstructed<void>,
        end: Promise<void>
    };
    hooks: HookSettings[];
    context: Context;
    aapi: AbortApi;
    parentState: State;
    triggers: TriggerState[];
}
