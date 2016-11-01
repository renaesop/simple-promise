/**
 * Created by fed on 2016/11/1.
 */
const gulp = require('gulp');
const babel = require('gulp-babel');

gulp.task('default', () => {
  return gulp.src('src/**/*.js')
    .pipe(babel({
      presets: ['es2015']
    }))
    .pipe(gulp.dest('lib'));
});