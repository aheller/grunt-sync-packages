'use strict';
var path = require('path');
var glob = require('glob');


module.exports = function (grunt, opts) {
    var module = {};

    if(!opts)
        opts = {};


    // dev environment config
    var env = {};
    var envFile = opts.env || 'env.json';
    if(grunt.file.exists(envFile)) {
        env = grunt.file.readJSON(envFile);
        if (!env) env = {};
    }

    // init local web packages source defined within env.json
    var getSourceWebPackages = function () {
        return env.sourceWebPackages || [];
    };
    module.getSourceWebPackages = getSourceWebPackages


    getSourceWebPackages().every(function (pkg) {
        var meta = grunt.file.readJSON(path.join(pkg.path, 'bower.json'));
        for (var prop in meta)
            pkg[prop] = meta[prop];

        if (pkg.main)
            pkg.main = typeof pkg.main === 'string' ? [pkg.main] : pkg.main;

        if (pkg.copy) {
            var files = [];
            pkg.copy.forEach(function (file) {
                if (file.indexOf('*') !== -1)
                    files = files.concat(glob.sync(file, {cwd: pkg.path}));
                else
                    files.push(file);
            });
            pkg.copy = files;
        }

        var gruntfile = pkg.path + 'Gruntfile.js';
        if(grunt.file.exists(gruntfile))
            pkg.gruntfile = gruntfile;
    });


    var getSourceWebPackage = function (filepath) {
        var inPkg;
        module.getSourceWebPackages().every(function (pkg) {
            if (filepath.indexOf(pkg.path) !== -1) {
                inPkg = pkg;
                return false;
            }
            return true;
        });
        return inPkg;
    };
    module.getSourceWebPackage = getSourceWebPackage



    var copySourceWebPackage = function (filepath, pkglist) {
        var pkg = getSourceWebPackage(filepath);
        if(pkg) {
            var pkgList = pkg[pkglist];
            if (pkgList) {
                var dest = filepath.replace(pkg.path, '');
                if (pkgList.indexOf(dest.replace(/\\/g, '/')) !== -1) {
                    if(pkglist == 'main')
                        dest  = 'bower_components\\' + pkg.name + '\\' + dest;

                    var srcDest = {};
                    srcDest[dest] = filepath;
                    grunt.config.set('bowercopy.watch.options.srcPrefix', pkg.path);
                    grunt.config.set('bowercopy.watch.files', srcDest);
                    grunt.task.run('bowercopy:watch');
                    return { pkg: pkg, src: filepath, dest: dest };
                }
            }
        }
        return;
    };
    module.copySourceWebPackage = copySourceWebPackage


    // on watch events configuration to only run on changed file
    if(opts.watch) {
        grunt.event.on('watch', function (action, filepath, target) {
            if (target === 'jade') {
                var sourceWebPackageFileChange = false;
                var copyResult = copySourceWebPackage(filepath, 'copy');
                if (copyResult) {
                    var pkg = copyResult.pkg;
                    filepath = copyResult.dest;

                    var jadeHtmlFile = pkg.path + '.tmp\\' + filepath.replace('.jade', '.html');
                    var srcDest = {};
                    srcDest[jadeHtmlFile] = pkg.path + filepath;
                    grunt.config.set('jade.watch.files', srcDest);
                    grunt.task.run('jade:watch');
                    if (pkg.gruntfile) {
                        grunt.config.set('hub.all.src', pkg.gruntfile);
                        grunt.config.set('hub.all.tasks', ['html2js']);
                        grunt.task.run('hub:all');
                    }
                    sourceWebPackageFileChange = true;
                }
                if (!sourceWebPackageFileChange) {
                    grunt.config.set('jade.dist.files.0.src', filepath.replace('app\\', ''));
                    grunt.task.run('jade:dist');
                    grunt.task.run('html2js');
                }
            }

            else if (target === 'sass') {
                var srcDest = {};
                var cssfilepath = filepath.replace('.scss', '.css');
                srcDest[cssfilepath] = filepath;
                grunt.config.set('sass.dist.files', srcDest);
                grunt.task.run('sass:dist');
                copySourceWebPackage(cssfilepath, 'main');
            }

            else if (target === 'js')
                copySourceWebPackage(filepath, 'main');
        });


        // init watch config
        if(opts.watch === true) {
            opts.watch = {
                js: {
                    files: []
                },
                jade: {
                    files: []
                },
                sass: {
                    files: []
                }
            };
        }
        module.watch = opts.watch

        getSourceWebPackages().forEach(function (pkg) {
            var normalizedPath = pkg.path.replace(/\\/g, '/');
            pkg.main.forEach(function (file) {
                var watchPath = normalizedPath + file;
                if(path.extname(file) === '.js')
                    opts.watch.js.files.push(watchPath);
            });
            pkg.copy.forEach(function (file) {
                var watchPath = normalizedPath + file;
                if (path.extname(file) === '.jade')
                    opts.watch.jade.files.push(watchPath);
            });
            pkg.sass.forEach(function (file) {
                var watchPath = normalizedPath + file;
                if (path.extname(file) === '.scss')
                    opts.watch.sass.files.push(watchPath);
            });
        });
    }



    return module;
};