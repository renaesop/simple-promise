/**
 * Created by fed on 2016/11/1.
 */
const Promise = require('../');

describe('Simple promise', () => {
  it('should work', (done) => {
    const result = 1;
    const pro1 = new Promise(function (resolve, reject) {
      resolve(result);
    });
    pro1.then(res => {
      if (result === res) {
        return done();
      }
      done(res);
    });
  });
});
