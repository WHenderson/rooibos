import {ContextHook} from "../types";

export type CallbackHook = (context: ContextHook) => void | PromiseLike<void>;
