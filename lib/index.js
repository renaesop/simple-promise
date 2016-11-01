'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

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
var ctxSymbol = Symbol();
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
      cbObject.next.setCtx(result);
      result[thenArraySymbol] = cbObject.next;
      result[checkState]();
    } else if (cbObject.next.length) {
      traverse(ctx, keyword, cbObject.next);
    }
  });
}

var AddOnArray = function (_Array) {
  _inherits(AddOnArray, _Array);

  function AddOnArray() {
    _classCallCheck(this, AddOnArray);

    return _possibleConstructorReturn(this, (AddOnArray.__proto__ || Object.getPrototypeOf(AddOnArray)).apply(this, arguments));
  }

  _createClass(AddOnArray, [{
    key: 'setCtx',
    value: function setCtx(ctx) {
      this[ctxSymbol] = ctx;
    }
  }, {
    key: 'push',
    value: function push() {
      var _get2;

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      (_get2 = _get(AddOnArray.prototype.__proto__ || Object.getPrototypeOf(AddOnArray.prototype), 'push', this)).call.apply(_get2, [this].concat(args));
      this[ctxSymbol] && this[ctxSymbol][checkState]();
    }
  }, {
    key: 'modifiedConcat',
    value: function modifiedConcat(args) {
      this.forEach(function (arg) {
        return args.push(arg);
      });
      return args;
    }
  }]);

  return AddOnArray;
}(Array);

var Promise = function () {
  function Promise(fn) {
    _classCallCheck(this, Promise);

    this[thenArraySymbol] = new AddOnArray();
    this[thenArraySymbol].setCtx(this);
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
      this[thenArraySymbol].length = 0;
      this[waitingCallback] = false;
    }
  }, {
    key: checkState,
    value: function value() {
      var _this2 = this;

      if (this[waitingCallback]) return;
      switch (this[stateSymbol]) {
        case StateList.resolved:
        case StateList.rejected:
          setTimeout(function () {
            _this2[cbSymbol]();
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
        next: new AddOnArray()
      };
      this[thenArraySymbol].push(obj);
      var nextFunc = function nextFunc(keyword, obj) {
        return function (fn) {
          var newObj = {
            type: keyword,
            fn: fn,
            next: new AddOnArray()
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