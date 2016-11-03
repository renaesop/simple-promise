/**
 * Created by fed on 2016/11/3.
 */
const Promise = require('../');

const adapter = {
  resolved: Promise.resolve,
  rejected: Promise.reject,
  deferred() {
    let resolve, reject;
    const promise = new Promise(function (_resolve, _reject) {
      resolve = _resolve;
      reject = _reject;
    });
    return {
      promise: promise,
      resolve: resolve,
      reject: reject
    };
  }
}

describe("Promises/A+ Tests", function () {
  require("promises-aplus-tests").mocha(adapter);
});