/**
 * Created by fed on 2016/11/2.
 */
var Promise = require('../');
var assert = require('assert');

var i = 0;
var sampleA;
var sampleB;
var N = 100000;
var t0 = Date.now();

console.log('--------start---------');
console.log('Start benchmark!');

function next() {
  return new Promise(function (resolve) {
    i++;
    if (i === N) {
      global.gc();
      sampleA = process.memoryUsage();
    }
    if (i > 10 * N) {
      global.gc();
      sampleB = process.memoryUsage();
      console.log('Memory usage at start is');
      console.dir(sampleA);
      console.log('Memory usage at end is');
      console.dir(sampleB);
      console.log('Total time %s ms!',Date.now() - t0);
      assert(sampleA.heapUsed *1.2 > sampleB, 'Memory grows should less than 20%');
      console.log('--------end---------');
    }
    else {
      resolve();
    }
  }).then(next);
}

next();