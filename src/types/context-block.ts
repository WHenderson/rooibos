import {UserOptionsBlock} from "./user-options-block";
import {ContextBase} from "./context-base";
import {CallbackBlock} from "./callback-block";
import {Context} from "./context";
import {BlockType} from "./block-type";

// Typescript limitation
type _ContextBlockBase = ContextBase & UserOptionsBlock;

export interface ContextBlock extends _ContextBlockBase {
    callback: CallbackBlock;
}

function isContextBlock(context: Context) : context is ContextBlock {
    return context && 'callback' in context && (
        context.blockType === BlockType.SCRIPT ||
        context.blockType === BlockType.DESCRIBE ||
        context.blockType === BlockType.IT
    );
}
