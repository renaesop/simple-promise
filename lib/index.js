'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Created by fed on 2016/10/31.
 */
var StateList = {
  constructed: 1,
  pending: 2,
  resolved: 4,
  rejected: 8
};
var keywords = {
  4: 'then',
  8: 'catch'
};

function traverse(ctx, keyword, item) {
  item.forEach(function (cbObject) {
    if (cbObject.type === keyword) {
      var result = void 0;
      try {
        result = cbObject.fn.call(ctx, ctx._result);
        if (!(result instanceof Promise)) {
          result = Promise.resolve(result);
        }
      } catch (e) {
        result = Promise.reject(e);
      }
      // 将未消耗的then chain传递给下一代，并做state check
      cbObject.next.setCtx(result);
      result._thenArray = cbObject.next;
      result._checkState();
    }
    // 不匹配则到其子中查找
    else if (cbObject.next.length) {
        traverse(ctx, keyword, cbObject.next);
      }
  });
}

// 用于生成 {then, catch}，使得链式调用then/catch，其存储时也是链式的
// 也就是
// interface nextInfo {
//   type: 'then' | 'catch',
//   fn: (res) => any,
//   next: [nextInfo]
// }
//
function nextFunc(keyword, obj) {
  return function (fn) {
    var newObj = {
      type: keyword,
      fn: fn,
      next: AddOnArray.factory()
    };
    obj.next.push(newObj);
    return {
      then: nextFunc('then', newObj),
      catch: nextFunc('catch', newObj)
    };
  };
}

var AddOnArray = function (_Array) {
  _inherits(AddOnArray, _Array);

  function AddOnArray() {
    _classCallCheck(this, AddOnArray);

    return _possibleConstructorReturn(this, (AddOnArray.__proto__ || Object.getPrototypeOf(AddOnArray)).apply(this, arguments));
  }

  _createClass(AddOnArray, [{
    key: 'push',
    value: function push() {
      var _get2;

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      (_get2 = _get(AddOnArray.prototype.__proto__ || Object.getPrototypeOf(AddOnArray.prototype), 'push', this)).call.apply(_get2, [this].concat(args));
      this._ctx && this._ctx._checkState();
    }
  }]);

  return AddOnArray;
}(Array);

AddOnArray.factory = function () {
  var ins = new AddOnArray();
  ins.setCtx = function (ctx) {
    this._ctx = ctx;
  };
  return ins;
};

var Promise = function () {
  function Promise(fn) {
    _classCallCheck(this, Promise);

    // 用户存储then
    this._thenArray = AddOnArray.factory();
    this._thenArray.setCtx(this);
    this._state = StateList.constructed;
    this._waitingCallback = false;
    this._result = null;
    this._state = StateList.pending;
    try {
      fn.call(this, this._resolve.bind(this), this._reject.bind(this));
    } catch (e) {
      this._reject(e);
    }
  }

  _createClass(Promise, [{
    key: '_cb',
    value: function _cb() {
      var keyword = keywords[this._state];
      traverse(this, keyword, this._thenArray);
      this._thenArray.length = 0;
      this._waitingCallback = false;
    }
  }, {
    key: '_checkState',
    value: function _checkState() {
      var _this2 = this;

      // 减少费时操作，合并起来一起做
      if (this._waitingCallback) return;
      switch (this._state) {
        case StateList.resolved:
        case StateList.rejected:
          setTimeout(function () {
            _this2._cb();
          }, 0);
          this._waitingCallback = true;
          break;
        default:
          return;
      }
    }
  }, {
    key: '_resolve',
    value: function _resolve(res) {
      if (this._state & (StateList.resolved | StateList.rejected)) return;
      this._result = res;
      this._state = StateList.resolved;
    }
  }, {
    key: '_reject',
    value: function _reject(err) {
      if (this._state & (StateList.resolved | StateList.rejected)) return;
      this._result = err;
      this._state = StateList.rejected;
    }
  }, {
    key: '_next',
    value: function _next(keyword, fn) {
      var obj = {
        type: keyword,
        fn: fn,
        next: AddOnArray.factory()
      };
      this._thenArray.push(obj);
      return {
        then: nextFunc('then', obj),
        catch: nextFunc('catch', obj)
      };
    }
  }, {
    key: 'then',
    value: function then(fn, fn1) {
      var result = this._next('then', fn);
      if (typeof fn1 === 'function') {
        result = result.catch(fn1);
      }
      return result;
    }
  }, {
    key: 'catch',
    value: function _catch(fn) {
      return this._next('catch', fn);
    }
  }, {
    key: '_state',
    get: function get() {
      return this.__state;
    },
    set: function set(val) {
      this.__state = val;
      this._checkState();
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