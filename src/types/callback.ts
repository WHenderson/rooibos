import {Context} from "./context";

export type Callback = (context: Context) => void | PromiseLike<void>;
