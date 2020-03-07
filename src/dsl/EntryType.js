"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var EnumNodeEntry;
(function (EnumNodeEntry) {
    EnumNodeEntry["describe"] = "describe";
    EnumNodeEntry["it"] = "it";
})(EnumNodeEntry = exports.EnumNodeEntry || (exports.EnumNodeEntry = {}));
// Hook types
var EnumHookEntry;
(function (EnumHookEntry) {
    EnumHookEntry["before"] = "before";
    EnumHookEntry["beforeEach"] = "beforeEach";
    EnumHookEntry["afterEach"] = "afterEach";
    EnumHookEntry["after"] = "after";
})(EnumHookEntry = exports.EnumHookEntry || (exports.EnumHookEntry = {}));
exports.EnumEntry = { ...EnumNodeEntry, ...EnumHookEntry };
//# sourceMappingURL=EntryType.js.map