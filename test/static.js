/**
 * Created by fed on 2016/11/1.
 */
const Promise = require('../');

describe('static methods', () => {
  describe('#then multiple args', () => {
    it('should work', (done) => {
      const reason = 'zzz';
      Promise.reject(reason).then(() => {}, (err) => {
        if (reason === err) return done();
        done(err);
      });
    });
  });
  describe('#all', () => {
    it('should work', (done) => {
      Promise.all([new Promise(function (resolve) {
        setTimeout(() => resolve(10), 100);
      }), Promise.resolve(20)]).then(function (result) {
        if (result.toString() === [10, 20].toString()) return done();
        done(result);
      })
    });
  });
  describe('#race', () => {
    it('should work', (done) => {
      Promise.race([new Promise(function (resolve) {
        setTimeout(() => resolve(10), 100);
      }), Promise.resolve(20)]).then(function (result) {
        if (result === 20) return done();
        done(result);
      })
    });
  });
});
