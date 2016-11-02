/**
 * Created by fed on 2016/11/2.
 */
var leak = require('./fixure/leak');
var Promise = require('promise');

leak(Promise, 'then promise');