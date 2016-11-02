/**
 * Created by fed on 2016/11/1.
 */
var gulp = require('gulp');
var babel = require('gulp-babel');
var readFileSync = require('fs').readFileSync;
var config = JSON.parse(readFileSync('./.babelrc').toString());

gulp.task('default', function() {
  return gulp.src('src/**/*.js')
    .pipe(babel(config))
    .pipe(gulp.dest('lib'));
});