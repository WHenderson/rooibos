import {HookContext} from "../types";

export type HookCallback = (context: HookContext) => void | PromiseLike<void>;
