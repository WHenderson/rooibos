import {UserOptionsBase} from "./user-options-base";

export interface UserOptionsBlock extends UserOptionsBase {
    description: string;
    timeout?: number;
    tags?: string[];
}