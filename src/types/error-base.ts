import {Context} from "./context";

export class ErrorBase extends Error {
    public context: Context;

    constructor(context: Context, message: string) {
        super(message);

        this.context = context;
    }
}
Object.defineProperty(ErrorBase.prototype, 'name', {
    enumerable: false, // this is the default
    configurable: true,
    value: ErrorBase.name,
    writable: true
});
