import {UserOptionsBase} from "./user-options-base";

export interface UserOptionsScript extends UserOptionsBase {
    description: string;
    timeout?: number;
}