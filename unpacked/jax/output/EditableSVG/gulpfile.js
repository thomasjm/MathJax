var gulp = require('gulp');

var concat = require('gulp-concat');
var merge = require('merge2');
var insert = require('gulp-insert');
var sourcemaps = require('gulp-sourcemaps');
var ts = require('gulp-typescript');

var tsProject = ts.createProject('tsconfig.json');

gulp.task('build', function() {
    var tsResult = gulp.src('ts/**/*.ts')
            .pipe(ts(tsProject));

    merge([ // Merge the two output streams, so this task is finished when the IO of both operations are done.
        tsResult.dts.pipe(gulp.dest('dist/definitions')),
        tsResult.js
            .pipe(sourcemaps.init())
            .pipe(concat('jax.js'))
//             .pipe(insert.append("\
// EditableSVG(MathJax.OutputJax.EditableSVG) \
// "))
            .pipe(sourcemaps.write())
            .pipe(gulp.dest('.'))
    ]);

    // gulp.src("jax.js")
    //     .pipe(insert.append("SOME STUFF AT THE END"))
    //     .pipe(gulp.dest('.'));
});

gulp.task('watch', ['build'], function() {
    gulp.watch('ts/**/*.ts', ['build']);
});
