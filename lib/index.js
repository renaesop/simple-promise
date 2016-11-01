'use strict';

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Created by fed on 2016/10/31.
 */
/**
 * 主要思路
 * 1. 向promise注册回调的回调，称呼为nextObjectArray
 * 2. promise的then方法可以被多次调用，也就是说nextObjectArray需要是数组，
 *    单个回调称为nextObject
 * 3. 可以向promise注册至少两种回调，也就是nextObject至少需要两个字段
 *    {
 *      type: 'then' | 'catch',
 *      fn: res => any
 *    }
 * 4. promise.then可以链式调用，而返回this不现实，也就是说nextObject需要是一个链表
 *    {
 *      type: 'then' | 'catch',
 *      fn: res => any,
 *      next: NextObjectArray
 *    }
 * 5. 执行promise的回调时，要遍历nextObjectArray中的每一项nextObject，直到在nextObject链中找到
 *    第一个符合回调类型的nextObject
 * 6. nextObject中的fn执行完毕之后，将其转化为promise
 * 7. 在如下时刻检查是否需要执行回调
 *  a. promise状态改变
 *  b. promise.then被调用
 *  c. nextObject中的fn执行完毕，生成新的promise，将nextObject传递给新的promise
 */
var StateList = {
  pending: 1,
  resolved: 2,
  rejected: 4
};
var keywords = {
  2: 'then',
  4: 'catch'
};

function traverse(promiseContext, callbackType, next) {
  next.forEach(function (callbackObject) {
    if (callbackObject.type === callbackType) {
      var result = void 0;
      try {
        result = callbackObject.fn.call(promiseContext, promiseContext._result);
        if (!(result instanceof Promise)) {
          result = Promise.resolve(result);
        }
      } catch (e) {
        result = Promise.reject(e);
      }
      // 将未消耗的nextObject chain传递给下一代，并做state check
      callbackObject.next.setCtx(result);
      result.next = callbackObject.next;
      result._checkState();
    }
    // 不匹配则到其子中查找
    else if (callbackObject.next.length) {
        traverse(promiseContext, callbackType, callbackObject.next);
      }
  });
}

var NextObject = function () {
  function NextObject(type, fn, ctx) {
    _classCallCheck(this, NextObject);

    this.type = type;
    this.fn = fn;
    this.next = NextObjectArray.factory(ctx);
  }

  _createClass(NextObject, [{
    key: 'addChild',
    value: function addChild(nextObject) {
      this.next.push(nextObject);
    }
  }]);

  return NextObject;
}();

// 用于生成 {then, catch}，使得链式调用then/catch，其存储时也是链式的
// 也就是
// interface nextInfo {
//   type: 'then' | 'catch',
//   fn: (res) => any,
//   next: [nextInfo]
// }
//


function nextFunc(nextType, parent) {
  return function (fn) {
    var nextObject = new NextObject(nextType, fn);
    parent.addChild(nextObject);
    return {
      then: nextFunc('then', nextObject),
      catch: nextFunc('catch', nextObject)
    };
  };
}

// 使用

var NextObjectArray = function (_Array) {
  _inherits(NextObjectArray, _Array);

  function NextObjectArray(ctx) {
    _classCallCheck(this, NextObjectArray);

    var _this = _possibleConstructorReturn(this, (NextObjectArray.__proto__ || Object.getPrototypeOf(NextObjectArray)).call(this));

    if (ctx instanceof Promise) _this._ctx = ctx;
    return _this;
  }

  _createClass(NextObjectArray, [{
    key: 'push',
    value: function push() {
      var _get2;

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      (_get2 = _get(NextObjectArray.prototype.__proto__ || Object.getPrototypeOf(NextObjectArray.prototype), 'push', this)).call.apply(_get2, [this].concat(args));
      this._ctx && this._ctx._checkState();
    }
  }]);

  return NextObjectArray;
}(Array);

NextObjectArray.factory = function (ctx) {
  var ins = new NextObjectArray(ctx);
  // 处理坑爹babel
  ins.setCtx = function (ctx) {
    if (ctx instanceof Promise) this._ctx = ctx;
  };
  return ins;
};

var Promise = function () {
  function Promise(fn) {
    _classCallCheck(this, Promise);

    // next是用于存储then/catch的列表
    this.next = NextObjectArray.factory(this);
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
    key: '_next',
    value: function _next(keyword, fn) {
      var obj = new NextObject(keyword, fn);
      this.next.push(obj);
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
    key: '_cb',

    // 找到nextObject chain第一个符合特征的进行执行
    // 执行完之后，要把nextObjectArray清空
    value: function _cb() {
      var keyword = keywords[this._state];
      traverse(this, keyword, this.next);
      this.next.length = 0;
      this._waitingCallback = false;
    }
    // 在以下时刻：
    //  a. 在promise内部状态改变的时刻
    //  b. 新增then/catch之时
    //  c. then/catch返回之后，生成新的promise，将后续的then/catch传递给promise
    // 可能需要去执行this.next里面的回调函数
    //

  }, {
    key: '_checkState',
    value: function _checkState() {
      var _this2 = this;

      // 减少费时的递归操作，凑起来做
      if (this._waitingCallback) return;
      if (this._state & (StateList.resolved | StateList.rejected)) {
        setTimeout(function () {
          _this2._cb();
        }, 0);
        this._waitingCallback = true;
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
    key: '_state',
    get: function get() {
      return this.__state;
    }
    // 更改promise的state，触发一次checkState
    ,
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