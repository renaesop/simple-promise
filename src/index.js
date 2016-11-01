/**
 * Created by fed on 2016/10/31.
 */
const thenArraySymbol = Symbol();
const stateSymbol = Symbol();
const resolveSymbol = Symbol();
const rejectSymbol = Symbol();
const nextSymbol = Symbol();
const cbSymbol = Symbol();
const resultSymbol = Symbol();
const checkState = Symbol();
const waitingCallback = Symbol();
const StateList = {
  constructed: 1,
  pending: 2,
  resolved: 3,
  rejected: 4,
};
const keywords = {
  3: 'then',
  4: 'catch',
};

function traverse(ctx, keyword, item) {
  item.forEach(cbObject => {
    if (cbObject.type === keyword) {
    let result;
    try {
      result = cbObject.fn.call(ctx, ctx[resultSymbol]);
      if (!(result instanceof Promise)) {
        result = Promise.resolve(result);
      }
    }
    catch (e) {
      result = Promise.reject(e);
    }
    result[thenArraySymbol] = result[thenArraySymbol].concat(cbObject.next);
  }
else if(cbObject.next.length){
    traverse(ctx, keyword, cbObject.next);
  }
});
}

class Promise {
  constructor(fn) {
    this[thenArraySymbol] = [];
    this[stateSymbol] = StateList.constructed;
    this[waitingCallback] = false;
    this[resultSymbol] = null;
    this[stateSymbol] = StateList.pending;
    try {
      fn.call(this, this[resolveSymbol].bind(this), this[rejectSymbol].bind(this));
    }
    catch (e) {
      this[rejectSymbol](e);
    }
  }
  get [stateSymbol]() {
    return this.__state;
  }
  set [stateSymbol](val) {
    this.__state = val;
    this[checkState]();
  }
  [cbSymbol]() {
    const keyword = keywords[this[stateSymbol]];
    traverse(this, keyword, this[thenArraySymbol]);
    this[thenArraySymbol] = [];
    this[waitingCallback] = false;
  }
  [checkState]() {
    if (this[waitingCallback]) return;
    switch (this[stateSymbol]) {
      case StateList.resolved:
      case StateList.rejected:
        setTimeout(() => {
          this[cbSymbol]();
    }, 0);
    this[waitingCallback] = true;
    break;
  default:
    return;
  }
  }
  [resolveSymbol](res) {
    if (this[stateSymbol] === StateList.resolved || this[stateSymbol] === StateList.rejected) return;
    this[resultSymbol] = res;
    this[stateSymbol] = StateList.resolved;
  }
  [rejectSymbol](err) {
    if (this[stateSymbol] === StateList.resolved || this[stateSymbol] === StateList.rejected) return;
    this[stateSymbol] = StateList.rejected;
    this[resultSymbol] = err;
  }
  [nextSymbol](keyword, fn) {
    const obj = {
      type: keyword,
      fn,
      next: [],
    };
    this[thenArraySymbol].push(obj);
    this[checkState]();
    const nextFunc = function (keyword, obj) {
      return function (fn) {
        const newObj = {
          type: keyword,
          fn,
          next: [],
        };
        obj.next.push(newObj);
        return {
          then: nextFunc('then', newObj),
          catch: nextFunc('catch', newObj),
        };
      };
    };
    return {
      then: nextFunc('then', obj),
      catch: nextFunc('catch', obj),
    };
  }
  then(fn) {
    return this[nextSymbol]('then', fn);
  }
  catch(fn) {
    return this[nextSymbol]('catch', fn);
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
