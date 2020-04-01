import {ContextBlock} from "./context-block";
import {UserOptionsHook} from "./user-options-hook";
import {ContextBase} from "./context-base";
import {CallbackHook} from "./callback-hook";
import {Context} from "./context";
import {BlockType} from "./block-type";

// Typescript limitation
type _ContextHookBase = ContextBase & UserOptionsHook;

export interface ContextHook extends _ContextHookBase {
    creator: ContextBlock;
    trigger: ContextBlock;
    callback: CallbackHook;
}

function isContextHook(context: Context) : context is ContextBlock {
    return context &&
        'callback' in context &&
        'trigger' in context &&
        'creator' in context &&
        context.blockType === BlockType.HOOK;
}