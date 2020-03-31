export enum HookOnceWhen {
    BEFORE_ONCE = 'beforeOnce',
    AFTER_ONCE = 'afterOnce'
}

export enum HookEachWhen {
    BEFORE_EACH = 'beforeEach',
    AFTER_EACH = 'afterEach'
}

export const HookWhen = { ...HookOnceWhen, ...HookEachWhen };
export type HookWhen = HookOnceWhen | HookEachWhen;

export function isHookOnce(when: HookWhen): when is HookOnceWhen {
    return Object.values(HookOnceWhen).includes(when as HookOnceWhen);
}
export function isHookEach(when: HookWhen): when is HookEachWhen {
    return Object.values(HookEachWhen).includes(when as HookEachWhen);
}
export function isHookBefore(when: HookWhen) : boolean {
    return when === HookEachWhen.BEFORE_EACH || when === HookOnceWhen.BEFORE_ONCE;
}
export function isHookAfter(when: HookWhen) : boolean {
    return when === HookEachWhen.AFTER_EACH || when === HookOnceWhen.AFTER_ONCE;
}