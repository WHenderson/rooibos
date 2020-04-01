import {ErrorBase} from "./error-base";
import {Context} from "./context";

export class ErrorAbort extends ErrorBase {
    constructor(context: Context, message: string = 'Abort') {
        super(context, message);
    }
}
Object.defineProperty(ErrorAbort.prototype, 'name', {
    enumerable: false, // this is the default
    configurable: true,
    value: ErrorAbort.name,
    writable: true
});
