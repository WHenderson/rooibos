import {
    BlockType,
    Callback,
    HookCallback,
    HookDepth,
    HookEachWhen,
    HookOnceWhen,
    HookOptions,
    HookWhen,
    JsonValue
} from "./types";
import {Guid} from "guid-typescript";
import {Testish} from "./Testish";

export type DescribeFunc =
    ((description: string, callback: Callback) => void | Promise<void>) &
    ((callback: Callback) => void | Promise<void>);
export type ItFunc =
    ((description: string, callback: Callback) => void | Promise<void>) &
    ((callback: Callback) => void | Promise<void>);
export type NoteFunc =
    (id: Guid, description: string, value: (() => JsonValue) | JsonValue) => void | Promise<void>
export type HookFunc =
    ((description: string, callback: HookCallback) => void | Promise<void>) &
    ((callback: HookCallback) => void | Promise<void>);

export interface UserApiRoot {
    describe: DescribeFunc;
    it: ItFunc;
    note: NoteFunc;

    before: HookApiFunc;
    after: HookApiFunc;
    beforeEach: HookApiFunc;
    afterEach: HookApiFunc;

    timeout: (timeout: number) => UserApiRoot;
    testish: (options: Partial<{ timeout: number; }>) => UserApiRoot;
}

//interface UserApiRootInternal extends UserApiRoot {
//    hook: (description : string | HookCallback, callback? : HookCallback) => void | Promise<void>;
//    testish: (options: Partial<{ timeout: number; } | HookOptions>) => UserApiRootInternal;
//}

export interface HookApiKnownDepth {
    it: HookFunc;
    describe: HookFunc;
}

export interface HookApi {
    it: HookFunc;
    describe: HookFunc;

    shallow: HookApiKnownDepth & HookFunc;
    deep: HookApiKnownDepth & HookFunc;
}

export type HookApiFunc = HookFunc & HookApi;

export function testish(testish: Testish, defaults?: Partial<{ timeout: number; } & HookOptions>) : UserApiRoot {
    const instance = testish;

    function testishApi(defaults: Partial<{ timeout: number; }>) : UserApiRoot {
        defaults = Object.assign({}, defaults);

        const hookDefaults = {
            timeout: undefined,
            depth: HookDepth.ALL,
            blockTypes: [BlockType.IT, BlockType.DESCRIBE]
        };

        // timeout
        function timeout(timeout: number) : UserApiRoot {
            return testish({ timeout });
        }

        // testish
        function testish(options: Partial<{ timeout: number; } & HookOptions>) : UserApiRoot {
            return testishApi(Object.assign({}, defaults, options));
        }

        // describe
        function describe(description : string | Callback, callback? : Callback) : void | Promise<void> {
            if (typeof description !== 'string') {
                callback = description;
                description = description && description.name || undefined;
            }
            return instance.describe(description, callback, { timeout: defaults.timeout });
        }

        // it
        function it(description : string | Callback, callback? : Callback) : void | Promise<void> {
            if (typeof description !== 'string') {
                callback = description;
                description = description && description.name || undefined;
            }
            return instance.it(description, callback, { timeout: defaults.timeout });
        }

        // note
        function note(id: Guid, description: (string | (() => JsonValue) | JsonValue), value?: (() => JsonValue) | JsonValue) : void | Promise<void> {
            if (arguments.length === 2) {
                value = description;
                description = value && typeof value === 'function' && value.name || undefined;
            }
            return instance.note(id, description as string, value);
        }

        // hook
        function hook(description : string | HookCallback, callback : HookCallback, options: Partial<HookOptions> & Pick<HookOptions, 'when'>) : void | Promise<void> {
            if (typeof description !== 'string') {
                callback = description;
                description = description && description.name || undefined;
            }
            return instance.hook(
                description,
                callback,
                Object.assign(
                    {},
                        hookDefaults,
                        defaults,
                        options
                )
            );
        }
        
        // before
        function before(description : string | HookCallback, callback? : HookCallback) : void | Promise<void> {
            return hook(description, callback, { when: HookOnceWhen.BEFORE_ONCE });
        }

        // after
        function after(description : string | HookCallback, callback? : HookCallback) : void | Promise<void> {
            return hook(description, callback, { when: HookOnceWhen.AFTER_ONCE });
        }

        // beforeEach
        function beforeEach(description : string | HookCallback, callback? : HookCallback) : void | Promise<void> {
            return hook(description, callback, { when: HookEachWhen.BEFORE_EACH });
        }

        // afterEach
        function afterEach(description : string | HookCallback, callback? : HookCallback) : void | Promise<void> {
            return hook(description, callback, { when: HookEachWhen.AFTER_EACH });
        }        

        function addHookApi(root: HookFunc, when: HookWhen) : HookApiFunc {
            function describe(description : string | HookCallback, callback? : HookCallback) : void | Promise<void> {
                return hook(description, callback, { when, blockTypes: [BlockType.DESCRIBE] });
            }
            function it(description : string | HookCallback, callback? : HookCallback) : void | Promise<void> {
                return hook(description, callback, { when, blockTypes: [BlockType.IT] });
            }

            function shallow(description : string | HookCallback, callback? : HookCallback) : void | Promise<void> {
                return hook(description, callback, { when, depth: HookDepth.SHALLOW });
            }
            function deep(description : string | HookCallback, callback? : HookCallback) : void | Promise<void> {
                return hook(description, callback, { when, depth: HookDepth.DEEP });
            }

            function addHookApiKnownDepth(root: HookFunc, depth: HookDepth) : HookApiKnownDepth & HookFunc {
                function describe(description : string | Callback, callback? : HookCallback) : void | Promise<void> {
                    return hook(description, callback, { when, depth, blockTypes: [BlockType.DESCRIBE] });
                }
                function it(description : string | Callback, callback? : HookCallback) : void | Promise<void> {
                    return hook(description, callback, { when, depth, blockTypes: [BlockType.IT] });
                }

                return Object.assign(
                    root,
                    {
                        describe,
                        it
                    }
                )
            }
            
            return Object.assign(
                root,
                {
                    describe,
                    it,
                    shallow: addHookApiKnownDepth(shallow, HookDepth.SHALLOW),
                    deep: addHookApiKnownDepth(deep, HookDepth.DEEP)
                }
            )
        }

        return {
            describe,
            it,
            note,

            before: addHookApi(before, HookOnceWhen.BEFORE_ONCE),
            after: addHookApi(after, HookOnceWhen.AFTER_ONCE),
            beforeEach: addHookApi(beforeEach, HookEachWhen.BEFORE_EACH),
            afterEach: addHookApi(afterEach, HookEachWhen.AFTER_EACH),

            timeout,
            testish
        }
        
    }
    return testishApi(defaults);
}


