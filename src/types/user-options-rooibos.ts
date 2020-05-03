import {UserOptionsBase} from "./user-options-base";

export interface UserOptionsRooibos extends UserOptionsBase {
    description: string;
    timeout?: number;
    only?: string[];
}