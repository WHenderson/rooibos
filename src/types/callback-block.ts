import {ContextBlock} from "./context-block";

export type CallbackBlock = (context: ContextBlock) => void | PromiseLike<void>;
