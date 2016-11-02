/**
 * Created by fed on 2016/11/2.
 */
const Promise = require('../');
const assert = require('assert');

describe('#checkType', () => {
  it('should works', () => {
    const pro = Promise.resolve(1).then(val => val);
    const pro1 = pro.then(val => val);
    assert.equal(pro instanceof Promise, true);
    assert.equal(pro1 instanceof Promise, true);
  })
});