Promise.resolve()
    .then(() => {
        console.log('a');
        return Promise.resolve()
            .then(async () => {
                console.log('ax');
                return Promise.resolve()
                    .then(async () => { console.log('ax1'); })
                    .then(async () => { console.log('ax2'); })
                    .then(async () => { console.log('ax3'); })
            })
            .then(() => {
                console.log('ay');
                return Promise.resolve()
                    .then(async () => { console.log('ay1'); })
                    .then(async () => { console.log('ay2'); })
                    .then(async () => { console.log('ay3'); })
            })
            .then(() => {
                console.log('az');
                return Promise.resolve()
                    .then(async () => { console.log('az1'); })
                    .then(async () => { console.log('az2'); })
                    .then(async () => { console.log('az3'); })
            })
    });