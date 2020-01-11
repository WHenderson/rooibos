import { before, beforeEach, describe, test, afterEach, after, testish } from '../../src/ts/fluid';
import { strict as assert } from 'assert';

before('root:before', async () => {
    console.log('1');
});

after('root:after', async () => {
    console.log('143');
});

beforeEach('root:beforeEach', async () => {
    console.log('2, 49, 96');
});

afterEach('root:afterEach', async () => {
    console.log('48, 95, 142');
});

describe('root/describeA', async () => {
    console.log('3');

    before('root/describeA:before', async () => {
        console.log('4');
    });

    after('root/describeA:after', async () => {
        console.log('47');
    });

    beforeEach('root/describeA:beforeEach', async () => {
        console.log('5, 19, 33');
    });

    afterEach('root/describeA:afterEach', async () => {
        console.log('18, 32, 46');
    });

    describe('root/describeA/describeX', async () => {
        console.log('6');

        before('root/describeA/describeX:before', async () => {
            console.log('7');
        });

        after('root/describeA/describeX:after', async () => {
            console.log('17');
        });

        beforeEach('root/describeA/describeX:beforeEach', async () => {
            console.log('8, 11, 14');
        });

        afterEach('root/describeA/describeX:afterEach', async () => {
            console.log('10, 13, 16');
        });

        test('root/describeA/describeX/testA', async () => {
            console.log('9');
        });

        test('root/describeA/describeX/testB', async () => {
            console.log('12');
        });

        test('root/describeA/describeX/testC', async () => {
            console.log('15');
        });
    });

    describe('root/describeA/describeY', async () => {
        console.log('20');

        before('root/describeA/describeY:before', async () => {
            console.log('21');
        });

        after('root/describeA/describeY:after', async () => {
            console.log('31');
        });

        beforeEach('root/describeA/describeY:beforeEach', async () => {
            console.log('22, 25, 28');
        });

        afterEach('root/describeA/describeY:afterEach', async () => {
            console.log('24, 27, 30');
        });

        test('root/describeA/describeY/testA', async () => {
            console.log('23');
        });

        test('root/describeA/describeY/testB', async () => {
            console.log('26');
        });

        test('root/describeA/describeY/testC', async () => {
            console.log('29');
        });
    });

    describe('root/describeA/describeZ', async () => {
        console.log('34');

        before('root/describeA/describeZ:before', async () => {
            console.log('35');
        });

        after('root/describeA/describeZ:after', async () => {
            console.log('45');
        });

        beforeEach('root/describeA/describeZ:beforeEach', async () => {
            console.log('36, 39, 42');
        });

        afterEach('root/describeA/describeZ:afterEach', async () => {
            console.log('38, 41, 44');
        });

        test('root/describeA/describeZ/testA', async () => {
            console.log('37');
        });

        test('root/describeA/describeZ/testB', async () => {
            console.log('40');
        });

        test('root/describeA/describeZ/testC', async () => {
            console.log('43');
        });
    });
});

testish({ timeoutDescribe: 500 }).describe('root/describeB', async () => {
    console.log('50');

    before('root/describeB:before', async () => {
        console.log('51');
    });

    after('root/describeB:after', async () => {
        console.log('94');
    });

    beforeEach('root/describeB:beforeEach', async () => {
        console.log('52, 66, 80');
    });

    afterEach('root/describeB:afterEach', async () => {
        console.log('65, 79, 93');
    });

    describe('root/describeB/describeX', async () => {
        console.log('53');

        before('root/describeB/describeX:before', async () => {
            console.log('54');
        });

        after('root/describeB/describeX:after', async () => {
            console.log('64');
        });

        beforeEach('root/describeB/describeX:beforeEach', async () => {
            console.log('55, 58, 61');
        });

        afterEach('root/describeB/describeX:afterEach', async () => {
            console.log('57, 60, 63');
        });

        test('root/describeB/describeX/testA', async (context) => {
            console.log('56');

            await new Promise((resolve, reject) => {
                let id = setTimeout(() => {
                    delete context.cancel;
                    resolve();
                }, 300);
                context.cancel = () => { clearTimeout(id) };
            });
        });

        test('root/describeB/describeX/testB', async (context) => {
            console.log('59');

            await new Promise((resolve, reject) => {
                let id = setTimeout(() => {
                    delete context.cancel;
                    resolve();
                }, 300);
                context.cancel = () => { clearTimeout(id) };
            });
        });

        test('root/describeB/describeX/testC', async (context) => {
            console.log('62');

            await new Promise((resolve, reject) => {
                let id = setTimeout(() => {
                    delete context.cancel;
                    resolve();
                }, 300);
                context.cancel = () => { clearTimeout(id) };
            });
        });
    });

    describe('root/describeB/describeY', async () => {
        console.log('67');

        before('root/describeB/describeY:before', async () => {
            console.log('68');
        });

        after('root/describeB/describeY:after', async () => {
            console.log('78');
        });

        beforeEach('root/describeB/describeY:beforeEach', async () => {
            console.log('69, 72, 75');
        });

        afterEach('root/describeB/describeY:afterEach', async () => {
            console.log('71, 74, 77');
        });

        test('root/describeB/describeY/testA', async () => {
            console.log('70');
        });

        test('root/describeB/describeY/testB', async () => {
            console.log('73');
        });

        test('root/describeB/describeY/testC', async () => {
            console.log('76');
        });
    });

    describe('root/describeB/describeZ', async () => {
        console.log('81');

        before('root/describeB/describeZ:before', async () => {
            console.log('82');
        });

        after('root/describeB/describeZ:after', async () => {
            console.log('92');
        });

        beforeEach('root/describeB/describeZ:beforeEach', async () => {
            console.log('83, 86, 89');
        });

        afterEach('root/describeB/describeZ:afterEach', async () => {
            console.log('85, 88, 91');
        });

        test('root/describeB/describeZ/testA', async () => {
            console.log('84');
        });

        test('root/describeB/describeZ/testB', async () => {
            console.log('87');
        });

        test('root/describeB/describeZ/testC', async () => {
            console.log('90');
        });
    });
});

describe('root/describeC', async () => {
    console.log('97');

    before('root/describeC:before', async () => {
        console.log('98');
    });

    after('root/describeC:after', async () => {
        console.log('141');
    });

    beforeEach('root/describeC:beforeEach', async () => {
        console.log('99, 113, 127');
    });

    afterEach('root/describeC:afterEach', async () => {
        console.log('112, 126, 140');
    });

    describe('root/describeC/describeX', async () => {
        console.log('100');

        before('root/describeC/describeX:before', async () => {
            console.log('101');
        });

        after('root/describeC/describeX:after', async () => {
            console.log('111');
        });

        beforeEach('root/describeC/describeX:beforeEach', async () => {
            console.log('102, 105, 108');
        });

        afterEach('root/describeC/describeX:afterEach', async () => {
            console.log('104, 107, 110');
        });

        test('root/describeC/describeX/testA', async () => {
            console.log('103');
        });

        test('root/describeC/describeX/testB', async () => {
            console.log('106');
        });

        test('root/describeC/describeX/testC', async () => {
            console.log('109');
        });
    });

    describe('root/describeC/describeY', async () => {
        console.log('114');

        before('root/describeC/describeY:before', async () => {
            console.log('115');
        });

        after('root/describeC/describeY:after', async () => {
            console.log('125');
        });

        beforeEach('root/describeC/describeY:beforeEach', async () => {
            console.log('116, 119, 122');
        });

        afterEach('root/describeC/describeY:afterEach', async () => {
            console.log('118, 121, 124');
        });

        test('root/describeC/describeY/testA', async () => {
            console.log('117');
        });

        test('root/describeC/describeY/testB', async () => {
            console.log('120');
        });

        test('root/describeC/describeY/testC', async () => {
            console.log('123');
        });
    });

    describe('root/describeC/describeZ', async () => {
        console.log('128');

        before('root/describeC/describeZ:before', async () => {
            console.log('129');
        });

        after('root/describeC/describeZ:after', async () => {
            console.log('139');
        });

        beforeEach('root/describeC/describeZ:beforeEach', async () => {
            console.log('130, 133, 136');
        });

        afterEach('root/describeC/describeZ:afterEach', async () => {
            console.log('132, 135, 138');
        });

        test('root/describeC/describeZ/testA', async () => {
            console.log('131');
        });

        test('root/describeC/describeZ/testB', async () => {
            console.log('134');
        });

        test('root/describeC/describeZ/testC', async () => {
            console.log('137');
        });
    });
});