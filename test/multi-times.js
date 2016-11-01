/**
 * Created by fed on 2016/11/1.
 */
const Promise = require('../');

describe('multiple times', () => {
  it('should work', (done) => {
    const pro = Promise.resolve(1).then(res => res + 1)
      .then(res => res + 2);
    const err = Error('err');
    const pro1 = pro.then(() => {
      throw err;
    }).catch(e => e);
    Promise.all([pro, pro, pro1]).then((res) => {
      if (res.toString() === [4, 4, err].toString()) {
        return done();
      }
      done(-1);
    });
  });
});
