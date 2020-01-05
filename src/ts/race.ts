export function race(timeout: number, pending : Promise<void>) : Promise<void> {
    if (!timeout)
        return pending;

    let id;

    return Promise
        .race([
            pending,
            new Promise((resolve, reject) => {
                id = setTimeout(() => {
                    clearTimeout(id);
                    reject(new Error('Timeout'));
                })
            })
        ])
        .then(() => {
            clearTimeout(id);
        });
}