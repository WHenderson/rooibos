import {BaseOptions} from "./base-options";

export interface BlockOptions extends BaseOptions {
    timeout?: number;
    tags?: string[];
}