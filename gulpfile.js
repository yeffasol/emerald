const gulp = require('gulp');
sync = require('browser-sync').create(),
  del = require('del'),
  runSequence = require('run-sequence'),
  gulpIf = require('gulp-if'),
  fileInclude = require('gulp-file-include'),
  htmlmin = require('gulp-htmlmin'),
  uglify = require('gulp-uglify'),
  gutil = require('gulp-util'),
  sourcemaps = require('gulp-sourcemaps'),
  plumber = require('gulp-plumber'),
  sass = require('gulp-sass'),
  postcss = require('gulp-postcss'),
  cssnano = require('gulp-cssnano'),
  csscomb = require('gulp-csscomb'),
  svgmin = require('gulp-svgmin'),
  svgstore = require('gulp-svgstore'),
  favicons = require("gulp-favicons"),
  imagemin = require('gulp-imagemin'),
  jpegtran = require('imagemin-jpegtran'),
  optipng = require('imagemin-optipng'),
  svgo = require('imagemin-svgo'),
  stylefmt = require('gulp-stylefmt'),
  pngquant = require('imagemin-pngquant'),
  imageminJpegRecompress = require('imagemin-jpeg-recompress'),
  purify = require('gulp-purifycss'),
  path = require('path');


let processors = [
    require('autoprefixer')(),
    require('postcss-easysprites')({
      imagePath: './src/images/',
      spritePath: './src/images'
    }),
    require('postcss-line-height-px-to-unitless')(), //line-height из px в число
    require('postcss-inline-svg')(), //вставка svg в css
    require('postcss-filter-gradient'),//поддержка градиентов ниже ie9
    require("postcss-color-rgba-fallback"),//добавляет цвет если нет поддержки прозрачности
    require('postcss-rgb-plz'),//конвертирует hex в rgb
    require('postcss-object-fit-images'),
    require('postcss-assets')({
      loadPaths: ['src/images/base64']
    }),
    require('css-mqpacker')({
      sort: true
    })
  ],
  assets = [
    'src/libraries{,/**}',
    '!src/html{,/**}',
    '!src/styles{,/**}',
    '!src/scripts/script.js',
  ],
  NODE_ENV = process.env.NODE_ENV || 'development';


gulp.task('copy', () => {
  return gulp.src(assets)
    .pipe(gulp.dest('./dest'))
});

gulp.task('html', () => {
  return gulp.src('src/html/pages/*.html')
    .pipe(fileInclude({
      prefix: '@@',
      basepath: '@file'
    }))
    .pipe(gulpIf(NODE_ENV === 'production',
      htmlmin({collapseWhitespace: true})
    ))
    .pipe(gulp.dest('dest'))
    .pipe(sync.stream());
});

gulp.task('styles', () => {
  return gulp.src('src/styles/style.scss')
    .pipe(plumber({
      errorHandler: function (error) {
        gutil.log('Error: ' + error.message);
        this.emit('end');
      }
    }))
    .pipe(sass())
    .pipe(postcss(processors))
    .pipe(purify(['./dest/js/**/*.js','./dest/libraries/**/*.*', './dest/**/*.html']))
    .pipe(stylefmt())
    .pipe(gulpIf(NODE_ENV === 'production',
      cssnano()
    ))
    .pipe(gulp.dest('dest/styles'))
    .pipe(sync.stream());
});

gulp.task('images', () => {
  return gulp.src('src/images/*.+(jpg|JPG|png)')
    .pipe(imagemin({
      optipng: {
        optimizationLevel: 5
      },
      jpegtran: {
        progressive: true,
      },
      imageminJpegRecompress: ({
        loops: 5,
        min: 65,
        max: 70,
        quality: 'medium'
      }),
      pngquant: [{
        quality: '65-70', speed: 5
      }],
      verbose: true
    }))
    .pipe(gulp.dest('dest/images'))
});

gulp.task('svg', () => {
  return gulp.src('src/images/svg/*.svg')
    .pipe(svgmin(function (file) {
      let prefix = path.basename(file.relative, path.extname(file.relative));
      return {
        plugins: [{
          cleanupIDs: {
            prefix: prefix + '-',
            minify: true
          }
        }]
      };
    }))
    .pipe(svgstore())
    .pipe(gulp.dest('src/images'))
});

gulp.task('server', () => {
  sync.init({
    notify: false,
    open: false,
    server: {
      baseDir: 'dest'
    }
  });
});

gulp.task('watch', () => {
  gulp.watch('src/html/**/*.html', ['html']);
  gulp.watch('src/**/*.scss', ['styles']);
  gulp.watch(assets, ['copy']);
});

gulp.task('clean', () => {
  return del('dest/**/*');
});

gulp.task("favicons", function () {
  return gulp.src("src/images/logo.png").pipe(favicons({
    appName: "Emerald",
    appDescription: "This is my application",
    developerName: "Marat Shaymardanov",
    developerURL: "http://tatarchap.p-host.in/",
    background: "#020307",
    path: "favicons/",
    url: "http://tatarchap.p-host.in/",
    display: "standalone",
    orientation: "portrait",
    start_url: "/?homescreen=1",
    version: 1.0,
    logging: false,
    online: false,
    html: "index.html",
    pipeHTML: true,
    replace: true
  }))
    .on("error", gutil.log)
    .pipe(gulp.dest("dest/favicons"));
});

gulp.task('lint-css', function lintCssTask() {
  const gulpStylelint = require('gulp-stylelint');

  return gulp
    .src('dest/styles/style.css')
    .pipe(gulpStylelint({
      reporters: [
        {formatter: 'string', console: true}
      ]
    }));
});

gulp.task('build', () => {
  runSequence( ['copy', 'images', 'favicons'], 'html', 'styles');
});
gulp.task('default', () => {
  runSequence(['copy', 'images'], 'html','styles', 'server', 'watch');
});
