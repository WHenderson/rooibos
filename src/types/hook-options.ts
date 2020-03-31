import {BaseOptions} from "./base-options";
import {HookTargetBlockType} from "./hook-target-block-type";
import {HookWhen} from "./hook-when";
import {HookDepth} from "./hook-depth";

export interface HookOptions extends BaseOptions {
    blockTypes: HookTargetBlockType[];
    when: HookWhen;
    depth: HookDepth;
    timeout?: number;
    tags?: string[];
}