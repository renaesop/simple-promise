# simple-promise

>一个简单的promise实现

[![Build Status](https://travis-ci.org/renaesop/simple-promise.svg?branch=master)](https://travis-ci.org/renaesop/simple-promise)
[![Build status](https://ci.appveyor.com/api/projects/status/ikn39wiu3fbh08uy/branch/master?svg=true)](https://ci.appveyor.com/project/renaesop/simple-promise/branch/master)
[![dependencies Status](https://david-dm.org/renaesop/simple-promise/status.svg)](https://david-dm.org/renaesop/simple-promise)
[![devDependencies Status](https://david-dm.org/renaesop/simple-promise/dev-status.svg)](https://david-dm.org/renaesop/simple-promise?type=dev)
[![Promise/A+ Logo](https://promisesaplus.com/assets/logo-small.png)](https://promisesaplus.com/)

项目已通过promise a plus test

执行测试: `npm test`

执行bench: `npm run bench`

##Promise的重要特性

在如下时刻检查是否需要执行回调:
- promise状态改变
- promise.then被调用
- nextObject中的fn执行完毕，生成新的promise，将nextObject传递给新的promise

## benchmark & memory

#### bluebird
````
--------start bluebird---------
Start benchmark!
Memory usage at start is
{ rss: 33701888, heapTotal: 16773120, heapUsed: 4861952 }
Memory usage at end is
{ rss: 33718272, heapTotal: 16773120, heapUsed: 4862200 }
Total time 386 ms!
`````

#### promise

````
--------start then promise---------
Start benchmark!
Memory usage at start is
{ rss: 32088064, heapTotal: 15724544, heapUsed: 4077552 }
Memory usage at end is
{ rss: 57253888, heapTotal: 40890368, heapUsed: 4088480 }
Total time 371 ms!
````

#### simple-pormise(this repo)
````
--------start simple-promise---------
Start benchmark!
Memory usage at start is
{ rss: 60047360, heapTotal: 41938944, heapUsed: 7242584 }
Memory usage at end is
{ rss: 61419520, heapTotal: 44036096, heapUsed: 7222720 }
Total time 2172 ms!
````

#### es(es6)
````
--------start es---------

Start benchmark!
Memory usage at start is
{ rss: 152784896, heapTotal: 135262208, heapUsed: 97369552 }
Memory usage at end is
{ rss: 1006039040, heapTotal: 988803072, heapUsed: 939507128 }
Total time 9287 ms!
````

#### mimi-promise
````
--------start mimi-promise---------

Start benchmark!
Memory usage at start is
{ rss: 117932032, heapTotal: 99610624, heapUsed: 63493432 }
Memory usage at end is
{ rss: 656711680, heapTotal: 637530112, heapUsed: 574386816 }
Total time 4537 ms!
````
