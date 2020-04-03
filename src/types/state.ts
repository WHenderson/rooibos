import {AbortApi, Deconstructed} from 'advanced-promises';
import {BlockType} from "./block-type";
import {HookSettings} from "./hook-settings";
import {TriggerState} from "./trigger-state";
import {Context} from "./context";
import {ResultAbort} from "./result-abort";

export interface State {
    blockType: BlockType;
    promiseStart: Deconstructed<void>;
    promise: Promise<void>;
    promiseAfter?: {
        start: Deconstructed<void>,
        end: Promise<void>
    };
    hooks: HookSettings[];
    context: Context;
    aapi: AbortApi;
    abort?: () => void | Promise<ResultAbort>;
    exception?: Error;
    parentState: State;
    triggers: TriggerState[];
}
