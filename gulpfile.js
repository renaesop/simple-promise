/**
 * Created by fed on 2016/11/1.
 */
var gulp = require('gulp');
var babel = require('gulp-babel');

gulp.task('default', function() {
  return gulp.src('src/**/*.js')
    .pipe(babel({
      presets: ['es2015']
    }))
    .pipe(gulp.dest('lib'));
});