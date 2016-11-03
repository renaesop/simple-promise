/**
 * Created by fed on 2016/10/31.
 */
/**
 * 主要思路
 * 1. 向promise注册的回调，称呼为nextObjectArray
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
const StateList = {
  pending: 1,
  resolved: 2,
  rejected: 4,
};
const keywords = {
  2: '_resolve',
  4: '_reject',
};

var LAST_ERROR;
const IS_ERROR = 'IS_ERROR';
const IS_FINISHED = 'IS_FINISHED';
const noop = () => {};

const asyncFn = function() {
  if (typeof process === 'object' && process !== null && typeof(process.nextTick) === 'function')
    return process.nextTick
  if (typeof(setImmediate) === 'function')
    return setImmediate
  return setTimeout
}();


function tryCallOne(fn, a) {
  try {
    return fn(a);
  } catch (ex) {
    LAST_ERROR = ex;
    return IS_ERROR;
  }
}

function tryCallTwo(fn, a, b) {
  try {
    return fn(a, b);
  } catch (ex) {
    LAST_ERROR = ex;
    return IS_ERROR;
  }
}

class Promise {
  constructor(fn) {
    // next是用于存储then/catch的列表
    this.next = [];
    this._result = null;
    this._state = StateList.pending;
    this._awakeType = null;
    this._awakeFunc = null;
    if (fn !== noop) {
      const result = tryCallTwo(fn, this._resolve.bind(this), this._reject.bind(this));
      result === IS_ERROR && this._reject(LAST_ERROR);
    }
  }
  _awake(type, result) {
    if (this._state & (StateList.resolved | StateList.rejected)) return;
    if (this._awakeType === type && typeof this._awakeFunc === 'function') {
      let awakeResult = tryCallOne(this._awakeFunc, result);
      if (awakeResult === IS_ERROR) {
        return this._reject(LAST_ERROR);
      }
      const err = tryCallOne(this._resolve.bind(this), awakeResult);
      if (err === IS_ERROR) {
        return this._reject(LAST_ERROR);
      }
    }
    else {
      const err = tryCallOne(this[type].bind(this), result);
      if (err === IS_ERROR) {
        this._reject(LAST_ERROR);
      }
    }
  }
  _next(keyword, fn) {
    const nextPromise = new Promise(noop);
    nextPromise._awakeType = keyword;
    nextPromise._awakeFunc = fn;
    if (this._state !== StateList.pending) {
      asyncFn(() => {
        nextPromise._awake(keywords[this._state], this._result);
      });
    }
    else {
      this.next.push(nextPromise);
    }
    return nextPromise;
  }
  then(fn, fn1) {
    return this._next(keywords[StateList.resolved], fn).catch(fn1);
  }
  catch(fn) {
    if (fn === undefined) return this;
    return this._next(keywords[StateList.rejected], fn);
  }
  // 在以下时刻：
  //  a. 在promise内部状态改变的时刻
  //  b. 新增then/catch之时
  //  c. then/catch返回之后，生成新的promise，将后续的then/catch传递给promise
  // 可能需要去执行this.next里面的回调函数
  //
  _checkState() {
    if (this._state !== StateList.pending) {
      asyncFn(() => {
        const keyword = keywords[this._state];
        this.next.forEach(pro => pro._awake(keyword, this._result));
        this.next.length = 0;
      });
    }
  }
  _resolve(res) {
    if (this._state !== StateList.pending)  return;
    if (res === this) {
      throw TypeError('`promise` and `x` cannot refer to the same object');
    }
    if (res instanceof Promise) {
      res.next = this.next;
      this.then = res.then.bind(res);
      this.catch = res.catch.bind(res);
      res._checkState();
      return;
    }
    if ((typeof res === 'object' && res !== null) || (typeof res === 'function')) {
      let invoked = false;
      try {
        const then = res.then;
        if (typeof then === 'function') {
          then.call(res, function (result) {
              if (!invoked) {
                invoked = true;
                this._resolve(result);
              }
            }.bind(this),
            function (err) {
              if (!invoked) {
                invoked = true;
                this._reject(err)
              }
            }.bind(this)
          );
          return;
        }
      }
      catch (e) {
        if (!invoked) {
          this._reject(e);
        }
        return;
      }
    }
    this._result = res;
    this._state = StateList.resolved;
    this._checkState();
  }
  _reject(err) {
    if (this._state & (StateList.resolved | StateList.rejected)) return;
    this._result = err;
    this._state = StateList.rejected;
    this._checkState();
  }
}

Promise.resolve = function (result) {
  if (result instanceof Promise) return result;
  return new Promise(function (resolve) {
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
    let pendingLength = promiseList.length;
    if (pendingLength === 0) return Promise.resolve(promiseList);
    const result = [];
    promiseList.forEach((pro, index) => pro.then((res) => {
      result[index] = res;
      pendingLength--;
      if (pendingLength === 0) return resolve(result);
    }).catch(e => {
      if (pendingLength > 0) reject(e);
    }));
  });
};

Promise.race = function (promiseList) {
  return new Promise(function (resolve, reject) {
    const promiseLength = promiseList.length;
    let state = 0;
    if (promiseLength < 1) throw Error('At least one promise!');
    promiseList.forEach((pro, index) => pro.then((res) => {
      if (state === 0) resolve(res);
      state = 1;
    }).catch(e => {
      if (promiseLength === 0) reject(e);
      state = -1;
    }));
  });
};

module.exports = Promise;
