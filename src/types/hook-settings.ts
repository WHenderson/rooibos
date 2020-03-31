import {CallbackHook} from "./callback-hook";
import {UserOptionsHook} from "./user-options-hook";

export interface HookSettings extends UserOptionsHook {
    description: string;
    callback: CallbackHook;
    executed: boolean;
}