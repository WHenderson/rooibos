import {ErrorBase} from "./error-base";
import {Context} from "./context";

export class ErrorTimeout extends ErrorBase {
    constructor(context: Context, message: string = 'Timeout') {
        super(context, message);
    }
}
Object.defineProperty(ErrorTimeout.prototype, 'name', {
    enumerable: false, // this is the default
    configurable: true,
    value: ErrorTimeout.name,
    writable: true
});
