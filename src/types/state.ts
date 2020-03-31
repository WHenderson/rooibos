import {AbortApi} from 'advanced-promises';
import {BlockType} from "./block-type";
import {HookDetails} from "./hook-details";
import {Context} from "./context";
import {HookContext} from "./hook-context";
import {TriggerState} from "./trigger-state";

export interface State {
    blockType: BlockType;
    promise: Promise<void>;
    hooks: HookDetails[];
    context: Context | HookContext;
    aapi: AbortApi;
    parentState: State;
    triggers: TriggerState[];
}
