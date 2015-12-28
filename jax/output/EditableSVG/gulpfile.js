/*
 *  /MathJax/jax/output/EditableSVG/gulpfile.js
 *
 *  Copyright (c) 2009-2015 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

var gulp=require("gulp");var ts=require("gulp-typescript");var merge=require("merge2");var concat=require("gulp-concat");var sourcemaps=require("gulp-sourcemaps");var tsProject=ts.createProject("tsconfig.json");gulp.task("build",function(){var a=gulp.src("ts/**/*.ts").pipe(ts(tsProject));return merge([a.dts.pipe(gulp.dest("dist/definitions")),a.js.pipe(sourcemaps.init()).pipe(concat("all.js")).pipe(sourcemaps.write()).pipe(gulp.dest("dist/"))])});gulp.task("watch",["build"],function(){gulp.watch("ts/**/*.ts",["build"])});
