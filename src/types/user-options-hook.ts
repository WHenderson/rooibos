import {BlockTypeHookTarget} from "./block-type-hook-target";
import {HookWhen} from "./hook-when";
import {HookDepth} from "./hook-depth";
import {UserOptionsBlock} from "./user-options-block";

export interface UserOptionsHook extends UserOptionsBlock {
    blockTypes: BlockTypeHookTarget[];
    when: HookWhen;
    depth: HookDepth;
    timeout?: number;
    tags?: string[];
}