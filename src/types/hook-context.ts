import {Context} from "./context";

export interface HookContext extends Context {
    creator: Context;
    trigger: Context;
}
