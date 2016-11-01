/**
 * Created by fed on 2016/10/31.
 */
const StateList = {
  constructed: 1,
  pending: 2,
  resolved: 4,
  rejected: 8,
};
const keywords = {
  4: 'then',
  8: 'catch',
};

function traverse(ctx, keyword, item) {
  item.forEach(cbObject => {
    if (cbObject.type === keyword) {
      let result;
      try {
        result = cbObject.fn.call(ctx, ctx._result);
        if (!(result instanceof Promise)) {
          result = Promise.resolve(result);
        }
      }
      catch (e) {
        result = Promise.reject(e);
      }
      // 将未消耗的then chain传递给下一代，并做state check
      cbObject.next.setCtx(result);
      result._thenArray = cbObject.next;
      result._checkState();
    }
    // 不匹配则到其子中查找
    else if(cbObject.next.length){
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
    const newObj = {
      type: keyword,
      fn,
      next: AddOnArray.factory(),
    };
    obj.next.push(newObj);
    return {
      then: nextFunc('then', newObj),
      catch: nextFunc('catch', newObj),
    };
  };
}

class AddOnArray extends Array{
  push(...args) {
    super.push(...args);
    this._ctx && this._ctx._checkState();
  }
}

AddOnArray.factory = function () {
  const ins = new AddOnArray();
  ins.setCtx = function (ctx) {
    this._ctx = ctx;
  };
  return ins;
};

class Promise {
  constructor(fn) {
    // 用户存储then
    this._thenArray = AddOnArray.factory();
    this._thenArray.setCtx(this);
    this._state = StateList.constructed;
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
  get _state() {
    return this.__state;
  }
  set _state(val) {
    this.__state = val;
    this._checkState();
  }
  _cb() {
    const keyword = keywords[this._state];
    traverse(this, keyword, this._thenArray);
    this._thenArray.length = 0;
    this._waitingCallback = false;
  }
  _checkState() {
    // 减少费时操作，合并起来一起做
    if (this._waitingCallback) return;
    switch (this._state) {
      case StateList.resolved:
      case StateList.rejected:
        setTimeout(() => {
          this._cb();
        }, 0);
        this._waitingCallback = true;
        break;
      default:
        return;
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
  _next(keyword, fn) {
    const obj = {
      type: keyword,
      fn,
      next: AddOnArray.factory(),
    };
    this._thenArray.push(obj);
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
