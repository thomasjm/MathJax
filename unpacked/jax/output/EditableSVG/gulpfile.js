var gulp = require('gulp');
var ts = require('gulp-typescript');
var merge = require('merge2');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');

var tsProject = ts.createProject('tsconfig.json');

gulp.task('build', function() {
    var tsResult = gulp.src('ts/**/*.ts')
            .pipe(ts(tsProject));

    return merge([ // Merge the two output streams, so this task is finished when the IO of both operations are done.
        tsResult.dts.pipe(gulp.dest('dist/definitions')),
        tsResult.js
            .pipe(sourcemaps.init())
            .pipe(concat('jax.js'))
            .pipe(sourcemaps.write())
            .pipe(gulp.dest('.'))
    ]);
});

gulp.task('watch', ['build'], function() {
    gulp.watch('ts/**/*.ts', ['build']);
});
