import {UserOptionsBase} from "./user-options-base";

export interface UserOptionsTestish extends UserOptionsBase {
    description: string;
    timeout?: number;
}