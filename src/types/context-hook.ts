import {ContextBlock} from "./context-block";

export interface ContextHook extends ContextBlock {
    creator: ContextBlock;
    trigger: ContextBlock;
}
