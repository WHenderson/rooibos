import { Context } from "./context";
import {EntryType} from "./events";

export interface Action extends Function {
    (this: Context, context?: Context): Promise<void> | void;
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

export const InheritableOptions = [
    'timeoutDefault',
    'timeoutBefore',
    'timeoutBeforeEach',
    'timeoutAfterEach',
    'timeoutAfter',
    'timeoutDescribe',
    'timeoutTest'
];

export function resolveTimeout(options: Options, entry: EntryType) : number {
    const specific = (() => {
        switch (entry) {
            case EntryType.before:
                return options.timeoutBefore;
            case EntryType.beforeEach:
                return options.timeoutBeforeEach;
            case EntryType.afterEach:
                return options.timeoutAfterEach;
            case EntryType.after:
                return options.timeoutAfter;
            case EntryType.describe:
                return options.timeoutDescribe;
            case EntryType.test:
                return options.timeoutTest;
        }
    })();

    return (typeof specific !== 'number' ? options.timeoutDefault : specific) || 0;
}

export interface NamedOptions extends Options {
    name: string;
    callback: Action;
}

interface NodeContract {
    (name: string, callback : Action, options?: Options) : Promise<void>;
    (callback : Action, options?: Options) : Promise<void>;
}

interface HookContract {
    (name: string, callback : Action, options?: Options) : void;
    (callback : Action, options?: Options) : void;
}

export interface Describe extends NodeContract {
    only: NodeContract;
    skip: NodeContract;
}

export interface Test extends NodeContract {
    only: NodeContract;
    skip: NodeContract;
}

export interface Before extends HookContract {
}

export interface BeforeEach extends HookContract {
}

export interface After extends HookContract {
}

export interface AfterEach extends HookContract {
}