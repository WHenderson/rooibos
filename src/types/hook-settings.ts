import {CallbackHook} from "./callback-hook";
import {UserOptionsHook} from "./user-options-hook";

export interface HookSettings extends UserOptionsHook {
    callback: CallbackHook;
    executed: boolean;
}