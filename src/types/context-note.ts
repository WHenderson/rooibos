// Typescript limitation
import {ContextBase} from "./context-base";
import {UserOptionsBlock} from "./user-options-block";
import {CallbackNote} from "./callback-note";
import {Context} from "./context";
import {ContextBlock} from "./context-block";
import {BlockType} from "./block-type";

type _ContextBlockBase = ContextBase & UserOptionsBlock;

export interface ContextNote extends _ContextBlockBase {
    callback: CallbackNote;
}

function isContextHook(context: Context) : context is ContextBlock {
    return context &&
        'callback' in context &&
        context.blockType === BlockType.NOTE;
}