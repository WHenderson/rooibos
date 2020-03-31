import {AbortApi} from 'advanced-promises';
import {BlockType} from "./block-type";

export interface ContextBlock {
    blockType: BlockType;
    description: string;
    parent: ContextBlock;
    data: object;
    aapi: AbortApi;
}
