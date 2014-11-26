
module.exports = function (grunt) {
    'use strict';

    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        uglify: {
            'gedcom-min': {
                options: {
                    sourceMap: true,
                },
                files: {
                    'dist/jsgedcom.min.js': ['src/*.js'],
                }
            },
            'gedcom': {
                options: {
                    sourceMap: false,
                    beautify: true
                },
                files: {
                    'dist/jsgedcom.js': ['src/*.js'],
                }
            }
        }
    });

    grunt.registerTask('default', ['uglify']);
};
