/**
 * Created by fed on 2016/11/2.
 */
var leak = require('./lib/leak');
var Promise = require('../');

leak(Promise, 'simple-promise');