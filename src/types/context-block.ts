import {AbortApi} from 'advanced-promises';
import {BlockType} from "./block-type";
import {UserOptionsBlock} from "./user-options-block";
import {ContextBase} from "./context-base";

// Typescript limitation
type _ContextBlockBase = ContextBase & UserOptionsBlock;

export interface ContextBlock extends _ContextBlockBase {
    blockType: BlockType;
    description: string;
    parent: ContextBlock;
    data: object;
    aapi: AbortApi;
}
