import {HookOptions} from "./hook-options";
import {HookCallback} from "./hook-callback";

export interface HookDetails extends HookOptions {
    description: string;
    callback: HookCallback;
    executed: boolean;
}