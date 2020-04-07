export enum BlockType {
    TESTISH = 'testish',
    SCRIPT = 'script',
    DESCRIBE = 'describe',
    IT = 'it',
    NOTE = 'note',
    HOOK = 'hook'
}

export function isHookTarget(blockType: BlockType) {
    return blockType === BlockType.SCRIPT || blockType === BlockType.DESCRIBE || blockType === BlockType.IT;
}