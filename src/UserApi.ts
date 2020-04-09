import {Guid} from "guid-typescript";
import {Testish} from "./Testish";
import {
    BlockType,
    CallbackBlock,
    CallbackHook,
    HookDepth,
    HookEachWhen,
    HookOnceWhen,
    UserOptionsHook, HookWhen,
    JsonValue, UserOptions, UserOptionsBlock
} from "./types";
import {Script} from "vm";

export type ScriptFunc =
    ((description: string, callback: CallbackBlock) => void | Promise<void>) &
    ((callback: CallbackBlock) => void | Promise<void>);
export type DescribeFunc =
    ((description: string, callback: CallbackBlock) => void | Promise<void>) &
    ((callback: CallbackBlock) => void | Promise<void>);
export type ItFunc =
    ((description: string, callback: CallbackBlock) => void | Promise<void>) &
    ((callback: CallbackBlock) => void | Promise<void>);
export type NoteFunc =
    ((id: Guid, description: string, value: (() => JsonValue) | JsonValue) => void | Promise<void>) &
    ((id: Guid, value: (() => JsonValue) | JsonValue) => void | Promise<void>);
export type HookFunc =
    ((description: string, callback: CallbackHook) => void | Promise<void>) &
    ((callback: CallbackHook) => void | Promise<void>);

export type TagFunc =
    (...tags: (string | string[])[]) => UserApiRoot;

export type TimeoutFunc =
    (timeout: number) => UserApiRoot;

export type TestishFunc =
    (options: Partial<{ timeout: number; }>) => UserApiRoot;

export interface UserApiRoot {
    script: ScriptFunc;
    describe: DescribeFunc;
    it: ItFunc;
    note: NoteFunc;

    before: HookApiFunc;
    after: HookApiFunc;
    beforeEach: HookApiFunc;
    afterEach: HookApiFunc;

    tag: TagFunc;
    timeout: TimeoutFunc;
    testish: TestishFunc;
}

export interface HookApiKnownDepth {
    it: HookFunc;
    describe: HookFunc;
}

export interface HookApi {
    script: HookFunc;
    describe: HookFunc;
    it: HookFunc;

    shallow: HookApiKnownDepth & HookFunc;
    deep: HookApiKnownDepth & HookFunc;
}

export type HookApiFunc = HookFunc & HookApi;

type DefaultUserOptions = Partial<Omit<UserOptionsBlock & UserOptionsHook, 'depth' | 'blockTypes' | 'when' | 'description'>>;

export function testish(testish: Testish, defaults?: DefaultUserOptions) : UserApiRoot {
    const instance = testish;

    function testishApi(defaults: DefaultUserOptions) : UserApiRoot {
        defaults = Object.assign({}, defaults);

        const hookDefaults : Omit<UserOptionsHook, 'when' | 'description'> = {
            timeout: undefined,
            depth: HookDepth.ALL,
            blockTypes: [BlockType.SCRIPT, BlockType.DESCRIBE, BlockType.IT]
        };

        // timeout
        function timeout(timeout: number) : UserApiRoot {
            return testish({ timeout });
        }

        // tag
        function tag(...tags: (string | string[])[]) : UserApiRoot {
            const flatTags = tags.map(tag => typeof tag === 'string' ? [tag] : tag).flat(1);
            return testish({ tags: (defaults.tags || []).concat(flatTags) });
        }

        // testish
        function testish(options: DefaultUserOptions) : UserApiRoot {
            return testishApi(Object.assign({}, defaults, options));
        }

        // describe
        function script(description : string | CallbackBlock, callback? : CallbackBlock) : void | Promise<void> {
            if (typeof description !== 'string') {
                callback = description;
                description = description && description.name || undefined;
            }
            return instance.script(description, callback, { timeout: defaults.timeout, tags: defaults.tags, data: defaults.data });
        }

        // describe
        function describe(description : string | CallbackBlock, callback? : CallbackBlock) : void | Promise<void> {
            if (typeof description !== 'string') {
                callback = description;
                description = description && description.name || undefined;
            }
            return instance.describe(description, callback, { timeout: defaults.timeout, tags: defaults.tags, data: defaults.data });
        }

        // it
        function it(description : string | CallbackBlock, callback? : CallbackBlock) : void | Promise<void> {
            if (typeof description !== 'string') {
                callback = description;
                description = description && description.name || undefined;
            }
            return instance.it(description, callback, { timeout: defaults.timeout, tags: defaults.tags, data: defaults.data });
        }

        // note
        function note(id: Guid, description: (string | (() => JsonValue) | JsonValue), value?: (() => JsonValue) | JsonValue) : void | Promise<void> {
            if (arguments.length === 2) {
                value = description;
                description = value && typeof value === 'function' && value.name || undefined;
            }
            return instance.note(id, description as string, value, { timeout: defaults.timeout, tags: defaults.tags, data: defaults.data });
        }

        // settings
        function hook(description : string | CallbackHook, callback : CallbackHook, options: Partial<UserOptionsHook> & Pick<UserOptionsHook, 'when'>) : void | Promise<void> {
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
        function before(description : string | CallbackHook, callback? : CallbackHook) : void | Promise<void> {
            return hook(description, callback, { when: HookOnceWhen.BEFORE_ONCE });
        }

        // after
        function after(description : string | CallbackHook, callback? : CallbackHook) : void | Promise<void> {
            return hook(description, callback, { when: HookOnceWhen.AFTER_ONCE });
        }

        // beforeEach
        function beforeEach(description : string | CallbackHook, callback? : CallbackHook) : void | Promise<void> {
            return hook(description, callback, { when: HookEachWhen.BEFORE_EACH });
        }

        // afterEach
        function afterEach(description : string | CallbackHook, callback? : CallbackHook) : void | Promise<void> {
            return hook(description, callback, { when: HookEachWhen.AFTER_EACH });
        }        

        function addHookApi(root: HookFunc, when: HookWhen) : HookApiFunc {
            function script(description : string | CallbackHook, callback? : CallbackHook) : void | Promise<void> {
                return hook(description, callback, { when, blockTypes: [BlockType.SCRIPT] });
            }
            function describe(description : string | CallbackHook, callback? : CallbackHook) : void | Promise<void> {
                return hook(description, callback, { when, blockTypes: [BlockType.DESCRIBE] });
            }
            function it(description : string | CallbackHook, callback? : CallbackHook) : void | Promise<void> {
                return hook(description, callback, { when, blockTypes: [BlockType.IT] });
            }

            function shallow(description : string | CallbackHook, callback? : CallbackHook) : void | Promise<void> {
                return hook(description, callback, { when, depth: HookDepth.SHALLOW });
            }
            function deep(description : string | CallbackHook, callback? : CallbackHook) : void | Promise<void> {
                return hook(description, callback, { when, depth: HookDepth.DEEP });
            }

            function addHookApiKnownDepth(root: HookFunc, depth: HookDepth) : HookApiKnownDepth & HookFunc {
                function script(description : string | CallbackBlock, callback? : CallbackHook) : void | Promise<void> {
                    return hook(description, callback, { when, depth, blockTypes: [BlockType.SCRIPT] });
                }
                function describe(description : string | CallbackBlock, callback? : CallbackHook) : void | Promise<void> {
                    return hook(description, callback, { when, depth, blockTypes: [BlockType.DESCRIBE] });
                }
                function it(description : string | CallbackBlock, callback? : CallbackHook) : void | Promise<void> {
                    return hook(description, callback, { when, depth, blockTypes: [BlockType.IT] });
                }

                return Object.assign(
                    root,
                    {
                        script,
                        describe,
                        it
                    }
                )
            }
            
            return Object.assign(
                root,
                {
                    script,
                    describe,
                    it,
                    shallow: addHookApiKnownDepth(shallow, HookDepth.SHALLOW),
                    deep: addHookApiKnownDepth(deep, HookDepth.DEEP)
                }
            )
        }

        return {
            script,
            describe,
            it,
            note,

            before: addHookApi(before, HookOnceWhen.BEFORE_ONCE),
            after: addHookApi(after, HookOnceWhen.AFTER_ONCE),
            beforeEach: addHookApi(beforeEach, HookEachWhen.BEFORE_EACH),
            afterEach: addHookApi(afterEach, HookEachWhen.AFTER_EACH),

            timeout,
            testish,
            tag
        }
        
    }
    return testishApi(defaults);
}


