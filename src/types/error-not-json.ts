import {ErrorBase} from "./error-base";
import {Context} from "./context";

export class ErrorNotJson extends ErrorBase {
    public value: any;
    constructor(context: Context, value: any, message: string = 'Not Json') {
        super(context, message);
        this.value = value;
    }
}
Object.defineProperty(ErrorNotJson.prototype, 'name', {
    enumerable: false, // this is the default
    configurable: true,
    value: ErrorNotJson.name,
    writable: true
});
