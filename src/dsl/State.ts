import {HookOptions, HookOptionsNamed, NodeOptions} from "./Options";
import {Context} from "./Context";

export interface State {
    hooks: HookOptionsNamed[];
    nodes: PromiseLike<any>; // child nodes

    options: NodeOptions & HookOptions;

    context: Context;
}
