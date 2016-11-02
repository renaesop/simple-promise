# simple-promise

>一个简单的promise实现

[![Build Status](https://travis-ci.org/renaesop/simple-promise.svg?branch=master)](https://travis-ci.org/renaesop/simple-promise)
[![Build status](https://ci.appveyor.com/api/projects/status/ikn39wiu3fbh08uy/branch/master?svg=true)](https://ci.appveyor.com/project/renaesop/simple-promise/branch/master)



## 实现的主要思路

1. 向promise注册的回调，称呼为nextObjectArray
2. promise的then方法可以被多次调用，也就是说nextObjectArray需要是数组，单个回调称为nextObject
3. 可以向promise注册至少两种回调，也就是nextObject至少需要两个字段
     ````typescript
     interface NextObject{
       type: 'then' | 'catch';
       fn: (any) => any;
     }
     ````
4. promise.then可以链式调用，而返回this不现实，也就是说nextObject需要是一个链表
   ````typescript
      interface NextObject{
         type: 'then' | 'catch';
         fn: (any) => any;
         next: [NextObject];
      }
   ````
 5. 执行promise的回调时，要遍历nextObjectArray中的每一项nextObject，直到在nextObject链中找到
   第一个符合回调类型的nextObject
 6. nextObject中的fn执行完毕之后，将其转化为promise
 7. 在如下时刻检查是否需要执行回调:
- promise状态改变
- promise.then被调用
- nextObject中的fn执行完毕，生成新的promise，将nextObject传递给新的promise