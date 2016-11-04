/**
 * Created by fed on 2016/11/3.
 */
var leak = require('./fixure/leak');
var Promise = require('mimi-promise/mimi-es6.js');

leak(Promise, 'mini-promise');