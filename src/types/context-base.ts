import {AbortApi} from 'advanced-promises';
import {UserOptionsBase} from "./user-options-base";
import {BlockType} from "./block-type";
import {ContextBlock} from "./context-block";
import {ResultAbort} from "./result-abort";

export interface ContextBase extends UserOptionsBase {
    blockType: BlockType;
    parent: ContextBlock;
    data: object;

    // Implemented as getters to the owning state
    aapi: AbortApi;
    exception: Error;
    abort: () => void | Promise<ResultAbort>;
}