import {JsonValue} from "./json";
import {ContextNote} from "./context-note";

export type CallbackNote = (context: ContextNote) => JsonValue | PromiseLike<JsonValue>;