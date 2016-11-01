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
const StateList = {
  pending: 1,
  resolved: 2,
  rejected: 4,
};
const keywords = {
  2: 'then',
  4: 'catch',
};

function traverse(promiseContext, callbackType, next) {
  next.forEach(callbackObject => {
    if (callbackObject.type === callbackType) {
      let result;
      try {
        result = callbackObject.fn.call(promiseContext, promiseContext._result);
        if (!(result instanceof Promise)) {
          result = Promise.resolve(result);
        }
      }
      catch (e) {
        result = Promise.reject(e);
      }
      // 将未消耗的nextObject chain传递给下一代，并做state check
      callbackObject.next.setCtx(result);
      result.next = callbackObject.next;
      result._checkState();
    }
    // 不匹配则到其子中查找
    else if(callbackObject.next.length){
      traverse(promiseContext, callbackType, callbackObject.next);
    }
  });
}

class NextObject {
  constructor(type, fn, ctx) {
    this.type = type;
    this.fn = fn;
    this.next = NextObjectArray.factory(ctx);
  }
  addChild(nextObject) {
    this.next.push(nextObject);
  }
}

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
    const nextObject = new NextObject(nextType, fn);
    parent.addChild(nextObject);
    return {
      then: nextFunc('then', nextObject),
      catch: nextFunc('catch', nextObject),
    };
  };
}

// 使用
class NextObjectArray extends Array{
  constructor(ctx) {
    super();
    if (ctx instanceof Promise) this._ctx = ctx;
  }
  push(...args) {
    super.push(...args);
    this._ctx && this._ctx._checkState();
  }
}

NextObjectArray.factory = function (ctx) {
  const ins = new NextObjectArray(ctx);
  // 处理坑爹babel
  ins.setCtx = function (ctx) {
    if (ctx instanceof Promise) this._ctx = ctx;
  };
  return ins;
};

class Promise {
  constructor(fn) {
    // next是用于存储then/catch的列表
    this.next = NextObjectArray.factory(this);
    this._waitingCallback = false;
    this._result = null;
    this._state = StateList.pending;
    try {
      fn.call(this, this._resolve.bind(this), this._reject.bind(this));
    }
    catch (e) {
      this._reject(e);
    }
  }
  _next(keyword, fn) {
    const obj = new NextObject(keyword, fn);
    this.next.push(obj);
    return {
      then: nextFunc('then', obj),
      catch: nextFunc('catch', obj),
    };
  }
  then(fn, fn1) {
    let result = this._next('then', fn);
    if (typeof fn1 === 'function') {
      result = result.catch(fn1);
    }
    return result;
  }
  catch(fn) {
    return this._next('catch', fn);
  }
  get _state() {
    return this.__state;
  }
  // 更改promise的state，触发一次checkState
  set _state(val) {
    this.__state = val;
    this._checkState();
  }
  // 找到nextObject chain第一个符合特征的进行执行
  // 执行完之后，要把nextObjectArray清空
  _cb() {
    const keyword = keywords[this._state];
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
  _checkState() {
    // 减少费时的递归操作，凑起来做
    if (this._waitingCallback) return;
    if (this._state & (StateList.resolved | StateList.rejected)) {
      setTimeout(() => {
        this._cb();
      }, 0);
      this._waitingCallback = true;
    }
  }
  _resolve(res) {
    if (this._state & (StateList.resolved | StateList.rejected)) return;
    this._result = res;
    this._state = StateList.resolved;
  }
  _reject(err) {
    if (this._state & (StateList.resolved | StateList.rejected)) return;
    this._result = err;
    this._state = StateList.rejected;
  }
}

Promise.resolve = function (result) {
  if (result instanceof Promise) return new Promise(function (resolve, reject) {
    return result.then(res => resolve(res), err => reject(err));
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
