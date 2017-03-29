/**
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
 */
'use strict';

var messages = require('./messages');
var _ = require('lodash');
var log = require('./logger')('route');

var me = require('./me').me;
var init = require('./init').init;
var build = require('./build');

var RAW_TOKEN = '__raw__';

// API map
var map = {
    'me': { args: ['key'], method: 'get', fn: me},
    'init': { args: ['user', 'project', 'fs'], method: 'get', fn: init},
    'info': { args: ['user', 'project', 'fs', 'uid'], method: 'get', fn: build.buildInfo},
    'remove': { args: ['user', 'project', 'uid'], method: 'get', fn: build.removeBuild},
    'build': { args: [ 'user', 'project', 'fs', 'uid', 'key', RAW_TOKEN ], method: 'post', fn: build.build}
};

// get arguments from request
//
// req - Object, express request
// from - Array, api arguments
function getArguments(req, from) {
    var args = [];
    _.each(from, function (arg) {
        if (RAW_TOKEN === arg) {
            args.push(JSON.parse(req.rawBody));
        } else {
            args.push(req.params[arg]);
        }
    });
    return args;
}

// Start app route
//
// app - Object, express app instance
exports.route = function (app) {
    // raw
    app.use(function (req, res, next) {
        req.rawBody = '';
        req.setEncoding('utf8');
        req.on('data', function (chunk) {
            req.rawBody += chunk;
        });
        req.on('end', function () {
            next();
        });
    });

    // routes
    _.each(map, function (route, main) {
        var routes = [ '/' + main ];
        _.each(route.args, function (arg, pos) {
            if (arg !== RAW_TOKEN) {
                routes.push(arg);
            }
        });
        var method = app[route.method].bind(app);
        var routeStr = routes.join('/:');
        method(routeStr, function (req, res) {
            res.contentType('application/json');
            var agrs = getArguments(req, route.args);
            route.fn.apply(this, agrs).then(function (data) {
                res.send(200, messages.success(data));
            }, function (err) {
                log.error('error:process', err);
                res.send(200, messages.error(err));
            });
        });
    });

    // errors
    app.use(function (err, req, res, next) {
        log.error('error:handler', err);
        res.send(500, messages.error(err));
    });

};