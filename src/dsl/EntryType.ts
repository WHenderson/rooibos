export enum EnumNodeEntry {
    describe = 'describe',
    it = 'it'
}

// Hook types
export enum EnumHookEntry {
    before = 'before',
    beforeEach = 'beforeEach',
    afterEach = 'afterEach',
    after = 'after'
}

export type EnumEntry = EnumNodeEntry | EnumHookEntry;
export const EnumEntry = { ...EnumNodeEntry, ...EnumHookEntry };