import {ContextBlock} from "./context-block";
import {JsonValue} from "./json";

export type CallbackNote = (context: ContextBlock) => JsonValue | PromiseLike<JsonValue>;