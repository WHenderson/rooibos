import {BlockTypeHookTarget} from "./block-type-hook-target";
import {HookWhen} from "./hook-when";
import {HookDepth} from "./hook-depth";
import {UserOptionsBase} from "./user-options-base";

export interface UserOptionsHook extends UserOptionsBase {
    description: string;
    timeout?: number;

    blockTypes: BlockTypeHookTarget[];
    when: HookWhen;
    depth: HookDepth;
}