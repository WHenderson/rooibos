import {AbortApi} from 'advanced-promises';
import {BlockType} from "./block-type";
import {HookSettings} from "./hook-settings";
import {ContextBlock} from "./context-block";
import {ContextHook} from "./context-hook";
import {TriggerState} from "./trigger-state";

export interface State {
    blockType: BlockType;
    promise: Promise<void>;
    hooks: HookSettings[];
    context: ContextBlock | ContextHook;
    aapi: AbortApi;
    parentState: State;
    triggers: TriggerState[];
}
