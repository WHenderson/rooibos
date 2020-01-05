import { Context } from "./context";

export interface Action extends Function {
    (this: Context, context: Context): Promise<void>;
}

export interface Options {
    only?: boolean;
    skip?: boolean;

    timeoutDefault?: number;
    timeoutBefore?: number;
    timeoutBeforeEach?: number;
    timeoutAfterEach?: number;
    timeoutAfter?: number;
    timeoutDescribe?: number;
    timeoutTest?: number;
}

export interface NamedOptions extends Options {
    name: string;
    callback: Action;
}

interface Contract {
    (name: string, callback : Action, options?: Options) : Promise<void>;
    (callback : Action, options?: Options) : void;
}

export interface Describe extends Contract {
    only: Contract;
    skip: Contract;
}

export interface Test extends Contract {
    only: Contract;
    skip: Contract;
}

export interface Before extends Contract {
}

export interface BeforeEach extends Contract {
}

export interface After extends Contract {
}

export interface AfterEach extends Contract {
}