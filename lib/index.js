'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Created by fed on 2016/10/31.
 */
var thenArraySymbol = Symbol();
var stateSymbol = Symbol();
var resolveSymbol = Symbol();
var rejectSymbol = Symbol();
var nextSymbol = Symbol();
var cbSymbol = Symbol();
var resultSymbol = Symbol();
var checkState = Symbol();
var waitingCallback = Symbol();
var StateList = {
  constructed: 1,
  pending: 2,
  resolved: 3,
  rejected: 4
};
var keywords = {
  3: 'then',
  4: 'catch'
};

function traverse(ctx, keyword, item) {
  item.forEach(function (cbObject) {
    if (cbObject.type === keyword) {
      var result = void 0;
      try {
        result = cbObject.fn.call(ctx, ctx[resultSymbol]);
        if (!(result instanceof Promise)) {
          result = Promise.resolve(result);
        }
      } catch (e) {
        result = Promise.reject(e);
      }
      result[thenArraySymbol] = result[thenArraySymbol].concat(cbObject.next);
    } else if (cbObject.next.length) {
      traverse(ctx, keyword, cbObject.next);
    }
  });
}

var Promise = function () {
  function Promise(fn) {
    _classCallCheck(this, Promise);

    this[thenArraySymbol] = [];
    this[stateSymbol] = StateList.constructed;
    this[waitingCallback] = false;
    this[resultSymbol] = null;
    this[stateSymbol] = StateList.pending;
    try {
      fn.call(this, this[resolveSymbol].bind(this), this[rejectSymbol].bind(this));
    } catch (e) {
      this[rejectSymbol](e);
    }
  }

  _createClass(Promise, [{
    key: cbSymbol,
    value: function value() {
      var keyword = keywords[this[stateSymbol]];
      traverse(this, keyword, this[thenArraySymbol]);
      this[thenArraySymbol] = [];
      this[waitingCallback] = false;
    }
  }, {
    key: checkState,
    value: function value() {
      var _this = this;

      if (this[waitingCallback]) return;
      switch (this[stateSymbol]) {
        case StateList.resolved:
        case StateList.rejected:
          setTimeout(function () {
            _this[cbSymbol]();
          }, 0);
          this[waitingCallback] = true;
          break;
        default:
          return;
      }
    }
  }, {
    key: resolveSymbol,
    value: function value(res) {
      if (this[stateSymbol] === StateList.resolved || this[stateSymbol] === StateList.rejected) return;
      this[resultSymbol] = res;
      this[stateSymbol] = StateList.resolved;
    }
  }, {
    key: rejectSymbol,
    value: function value(err) {
      if (this[stateSymbol] === StateList.resolved || this[stateSymbol] === StateList.rejected) return;
      this[stateSymbol] = StateList.rejected;
      this[resultSymbol] = err;
    }
  }, {
    key: nextSymbol,
    value: function value(keyword, fn) {
      var obj = {
        type: keyword,
        fn: fn,
        next: []
      };
      this[thenArraySymbol].push(obj);
      this[checkState]();
      var nextFunc = function nextFunc(keyword, obj) {
        return function (fn) {
          var newObj = {
            type: keyword,
            fn: fn,
            next: []
          };
          obj.next.push(newObj);
          return {
            then: nextFunc('then', newObj),
            catch: nextFunc('catch', newObj)
          };
        };
      };
      return {
        then: nextFunc('then', obj),
        catch: nextFunc('catch', obj)
      };
    }
  }, {
    key: 'then',
    value: function then(fn) {
      return this[nextSymbol]('then', fn);
    }
  }, {
    key: 'catch',
    value: function _catch(fn) {
      return this[nextSymbol]('catch', fn);
    }
  }, {
    key: stateSymbol,
    get: function get() {
      return this.__state;
    },
    set: function set(val) {
      this.__state = val;
      this[checkState]();
    }
  }]);

  return Promise;
}();

Promise.resolve = function (result) {
  if (result instanceof Promise) return new Promise(function (resolve, reject) {
    return result.then(function (res) {
      return resolve(res);
    }, function (err) {
      return reject(err);
    });
  });
  return new Promise(function (resolve, reject) {
    resolve(result);
  });
};

Promise.reject = function (err) {
  return new Promise(function (resolve, reject) {
    reject(err);
  });
};

Promise.all = function (promiseList) {
  return new Promise(function (resolve, reject) {
    var pendingLength = promiseList.length;
    if (pendingLength === 0) return Promise.resolve(promiseList);
    var result = [];
    promiseList.forEach(function (pro, index) {
      return pro.then(function (res) {
        result[index] = res;
        pendingLength--;
        if (pendingLength === 0) return resolve(result);
      }).catch(function (e) {
        if (pendingLength > 0) reject(e);
      });
    });
  });
};

Promise.race = function (promiseList) {
  return new Promise(function (resolve, reject) {
    var promiseLength = promiseList.length;
    var state = 0;
    if (promiseLength < 1) throw Error('At least one promise!');
    promiseList.forEach(function (pro, index) {
      return pro.then(function (res) {
        if (state === 0) resolve(res);
        state = 1;
      }).catch(function (e) {
        if (promiseLength === 0) reject(e);
        state = -1;
      });
    });
  });
};

module.exports = Promise;