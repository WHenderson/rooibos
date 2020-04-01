import {AbortApi} from 'advanced-promises';
import {UserOptionsBase} from "./user-options-base";
import {BlockType} from "./block-type";
import {ContextBlock} from "./context-block";

export interface ContextBase extends UserOptionsBase {
    blockType: BlockType;
    parent: ContextBlock;
    data: object;
    aapi: AbortApi;
}