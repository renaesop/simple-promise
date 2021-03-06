/**
 * Created by fed on 2016/11/2.
 */
var exec = require('child_process').execSync;
var path = require('path');

([
  'this.js',
  'bluebird.js',
  'then-promise.js',
  'es.js',
  'mini-promise.js',
]).map(function (item) {
  return path.join(__dirname, item);
}).forEach(function (moduleName) {
  exec('node --expose-gc ' + moduleName, {
    stdio: [null, process.stdout]
  });
  console.log('\n');
});