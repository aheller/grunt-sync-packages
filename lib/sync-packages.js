'use strict';
var path = require('path');
var glob = require('glob');


module.exports = function (grunt) {
    var module = {};

//    module.awesome = function () {
//        console.log(env);
//    };


    // dev environment config
    var env = {};
    if(grunt.file.exists('env.json')) {
        env = grunt.file.readJSON("env.json");
        if (!env) env = {};
    }

    // init local web packages source defined within env.json
    module.getSourceWebPackages = function () {
        return env.sourceWebPackages || [];
    };
    module.getSourceWebPackages().every(function (pkg) {
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

    return module;
};