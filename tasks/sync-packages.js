'use strict';

module.exports = function (grunt) {
    var path = require('path');
    var glob = require('glob');


    grunt.registerMultiTask('syncPackages', 'Sync locally maintained + installed internal web packages with working project', function () {

        var opts = this.options({
            env: '',
            watch: true
        });

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

        var sourceWebPackagesExist = function () {
            return env.sourceWebPackages && env.sourceWebPackages.length > 0;
        };



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
            if(grunt.file.exists(gruntfile)) {
                pkg.gruntfile = gruntfile;
                var gruntConfigFile = pkg.path + 'grunt.json';
                if (grunt.file.exists(gruntConfigFile))
                    pkg.gruntconfig = grunt.file.readJSON(gruntConfigFile);
            }
        });


        var getSourceWebPackage = function (filepath) {
            var inPkg;
            getSourceWebPackages().every(function (pkg) {
                if (filepath.indexOf(pkg.path) !== -1) {
                    inPkg = pkg;
                    return false;
                }
                return true;
            });
            return inPkg;
        };


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


        // on watch events configuration to only run on changed file
        var syncWatchFiles = {};
        if(opts.watch === true) {

            // init watch files config
            syncWatchFiles = {
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
                            if(pkg.gruntconfig && pkg.gruntconfig.tasks.html2js) {
                                grunt.config.set('hub.all.src', pkg.gruntfile);
                                grunt.config.set('hub.all.tasks', ['html2js']);
                                grunt.task.run('hub:all');
                                copySourceWebPackage(path.join(pkg.path, pkg.gruntconfig.tasks.html2js.main.dest), 'main');
                            }
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


            getSourceWebPackages().forEach(function (pkg) {
                var normalizedPath = pkg.path.replace(/\\/g, '/');
                pkg.main.forEach(function (file) {
                    var watchPath = normalizedPath + file;
                    if(path.extname(file) === '.js' && !/\-(templates|config)\.js$/.test(watchPath))
                        syncWatchFiles.js.files.push(watchPath);
                });
                pkg.copy.forEach(function (file) {
                    var watchPath = normalizedPath + file;
                    if (path.extname(file) === '.jade')
                        syncWatchFiles.jade.files.push(watchPath);
                });
                pkg.sass.forEach(function (file) {
                    var watchPath = normalizedPath + file;
                    if (path.extname(file) === '.scss')
                        syncWatchFiles.sass.files.push(watchPath);
                });
            });
        }















        grunt.config.set('bowercopy', {
            options: {
                clean: false, // if true, bower components folder will be removed afterwards
                runbower: false, // run bower install in conjunction with the bowercopy task
                report: false, // report any modules in your bower.json that have not been configured to copy
                srcPrefix: '<%= yeoman.app %>\\bower_components'
            },
            dist: {
                options: {
                    installedWebPackageMask: 'instinet-',
                    sourceWebPackages: getSourceWebPackages(),
                    destPrefix: '<%= yeoman.app %>'
                },
                files: {}
            },
            watch: {
                options: {
                    destPrefix: '<%= yeoman.app %>'
                },
                files: {}
            }
        });


        if(sourceWebPackagesExist()) {

            // run tasks against locally maintained web packages
            grunt.config.set('hub', {
                all: {
                    src: [],
                    tasks: []
                }
            });

            // set full list of files to watch across locally maintained web packages in addition to working project
            if (opts.watch === true && grunt.task.exists('watch')) {
                for (var t in syncWatchFiles) {
                    if (syncWatchFiles[t] && syncWatchFiles[t].files) {
                        var projWatchConfig = grunt.config.get('watch.' + t);
                        var projWatchFiles = projWatchConfig && projWatchConfig.files ? projWatchConfig.files : [];
                        projWatchFiles = projWatchFiles.concat(syncWatchFiles[t].files);
                        grunt.config.set('watch.' + t, {
                            files: projWatchFiles,
                            tasks: [],
                            options: {
                                livereload: true,
                                spawn: false
                            }
                        });
                    }
                }
            }

            // build locally maintained web packages
            getSourceWebPackages().every(function (pkg) {
                console.log('Building locally maintained web package "' + pkg.name + '" ...');
                if (pkg.gruntfile) {
                    grunt.config.set('hub.all.src', pkg.gruntfile);
                    grunt.config.set('hub.all.tasks', ['build']);
                    grunt.task.run('hub:all');
                }
            });
        }

        // finally run bowercopy:dist
        grunt.task.run('bowercopy:dist');
    });

};