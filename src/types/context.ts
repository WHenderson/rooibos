import {AbortApi} from 'advanced-promises';
import {BlockType} from "./block-type";

export interface Context {
    blockType: BlockType;
    description: string;
    parent: Context;
    data: object;
    aapi: AbortApi;
}
