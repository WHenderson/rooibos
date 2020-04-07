import {BlockType} from "./block-type";

export const BlockTypeHookTarget = { SCRIPT: BlockType.SCRIPT, DESCRIBE: BlockType.DESCRIBE, IT: BlockType.IT };
export type BlockTypeHookTarget = BlockType.SCRIPT | BlockType.DESCRIBE | BlockType.IT;

export function isHookTarget(blockType: BlockType) {
    return blockType === BlockType.SCRIPT || blockType === BlockType.DESCRIBE || blockType === BlockType.IT;
}