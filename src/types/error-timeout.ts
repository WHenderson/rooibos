export class ErrorTimeout extends Error {
    constructor(message = 'Timeout') {
        super(message);
    }
}
Object.defineProperty(ErrorTimeout.prototype, 'name', {
    enumerable: false, // this is the default
    configurable: true,
    value: ErrorTimeout.name,
    writable: true
});
