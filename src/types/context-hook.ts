import {ContextBlock} from "./context-block";
import {UserOptionsHook} from "./user-options-hook";

// Typescript limitation
type _ContextHookBase = ContextBlock & UserOptionsHook;

export interface ContextHook extends _ContextHookBase {
    creator: ContextBlock;
    trigger: ContextBlock;
}
