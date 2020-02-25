let lastTime = undefined;

export function log(message, ...messages) {
    const time = new Date();
    if (!lastTime)
        lastTime = time;
    const diff = `${+time-lastTime}ms`.padStart(6, ' ');

    if (message && !message.startsWith('##'))
        return;

    console.log(`${time.toISOString()} (${diff}) ${message}`, ...messages);
}