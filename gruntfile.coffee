###
 * Copyright Suchkov Dmitrii
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
###

module.exports = (grunt) ->
  grunt.initConfig
    jshint:
      all:
        src: [
          'index.js'
          'lib/**/*.js'
          'bin/api'
          'test/**/*.js'
        ]
      options:
        jshintrc: '.jshintrc'

    mochacov:
      options:
        files: [
          'test/mocha-globals.js'
          'test/**/*.spec.js'
        ]
        ui: 'bdd'
        colors: true
      unit:
        options:
          reporter: 'spec'


  grunt.loadNpmTasks 'grunt-contrib-jshint'
  grunt.loadNpmTasks 'grunt-simple-mocha'
  grunt.loadNpmTasks 'grunt-mocha-cov'

  grunt.registerTask 'test', ['mochacov:unit']

  grunt.registerTask 'default', ['jshint', 'test']