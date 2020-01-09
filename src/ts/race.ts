function isNumber(x: any) : x is number {
    return typeof x === 'number';
}

export function race(pending : Promise<void>, timeout? : number | Promise<void>, waitAbort?: Promise<void>) : Promise<void> {
    let waitTimeout;
    let timeoutId;
    if (timeout !== 0 && isNumber(timeout)) {
        waitTimeout = new Promise((resolve, reject) => {
            timeoutId = setTimeout(() => {
                clearTimeout(timeoutId);
                reject(new Error('Timeout'));
            }, timeout);
        });
    }

    if (waitTimeout) {
        if (waitAbort)
            return Promise.race([waitAbort, waitTimeout, pending]).finally(() => { clearTimeout(timeoutId) });
        else
            return Promise.race([waitTimeout, pending]).finally(() => { clearTimeout(timeoutId) });
    }
    else
        return pending;
}