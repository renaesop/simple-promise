/**
 * Created by slashhuang on 2016/11/1.
 */
const Promise = require('../');

describe('async promise', () => {
  it('should work', (done) => {
    const result = 1;
    const pro1 = new Promise(function (resolve, reject) {
      setTimeout(resolve,1000,1)
    });
    const pro2 = pro1.then(val => {
        console.log(val);
        return new Promise((res,rej)=>{
            res(2);
        })
    });
    setTimeout(()=>{
        pro2.then(val=>{
            console.log(val);
            done()
        });
    },2000)
  });
});
