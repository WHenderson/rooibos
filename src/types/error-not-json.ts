export class ErrorNotJson extends Error {
    public value: any;
    constructor(value, message = 'Not Json') {
        super(message);
        this.value = value;
    }
}
Object.defineProperty(ErrorNotJson.prototype, 'name', {
    enumerable: false, // this is the default
    configurable: true,
    value: ErrorNotJson.name,
    writable: true
});
