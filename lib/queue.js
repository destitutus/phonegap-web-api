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

var amqp = require('amqplib');
var config = require('../config');
var q = require('q');
var domain = require('domain');
var mongo = require('./mongo');
var build = require('./build');
var client = require('phonegap-build-api');
var auth = q.denodeify(client.auth);
var _ = require('lodash');
var messages = require('./messages');
var log = require('./logger')('queue');

var exchange = null;

// process queue message
//
// msg - Object, message
function processMessage(msg) {
    var user = msg.user;
    var project = msg.project;
    var key = msg.key;
    var uid = msg.uid;
    var appId;
    log.trace('processMessage', user, project, uid);
    return mongo.findProject(user, project, uid).then(function (data) {
        if (!data || !data.data || !data.data.id) {
            return q.reject('Not found');
        }
        appId = data.data.id;
        return auth({token: key});
    }).then(function (api) {
        log.trace('processMessage:get info', user, project, uid);
        var get = q.denodeify(api.get);
        return get('/apps/' + appId);
    }).then(function (data) {
        var hasPending = false;
        _.each(data.status, function (status, key) {
            if (status === 'pending') {
                hasPending = true;
            }
        });
        if (hasPending) {
            // has pending builds, publish task again
            exports.publishTask(user, project, key, uid);
        }
        log.trace('processMessage:save data', user, project, uid);
        return mongo.saveProject(user, project, uid, data);
    }).fail(function (err) {
        log.trace('processMessage:error', user, project, uid, err);
        // save error state
        var msg = messages.convertPhonegapError(err);
        mongo.saveProject(user, project, uid, {error: msg});
        return q.reject(msg);
    });
}

// Init queues
//
// connection - Object, active rmq connection
function initQueues(connenction) {
    var optsTask = config.rabbitmq.tasks;
    var optsAutoTask = config.rabbitmq.autoTasks;

    var def = q.defer();
    exchange = def.promise;

    connenction.createChannel().then(function (ch) {
        function phonegapMessages(msg) {
            var d = domain.create();
            var done = function () {
                done = function () {};
                ch.ack(msg);
                d.dispose();
            };
            d.on('error', done);
            d.run(function () {
                process.nextTick(function () {
                    var message = JSON.parse(msg.content.toString());
                    processMessage(message).fin(done);
                });
            });
        }
        var ok = ch.assertQueue(optsTask.name, optsTask);
        ok = ok.then(function (qok) {
            return ch.prefetch(30).then(function () {
                return qok.queue;
            });
        });
        ok = ok.then(function (queue) {
            return ch.consume(queue, phonegapMessages, {noAck: false});
        });
    });

    connenction.createChannel().then(function (ch) {
        var ok = ch.assertExchange(optsAutoTask.name, optsAutoTask.type, optsAutoTask);
        ch.on('close', function () {
            def.reject();
        });
        return ok.then(function () {
            def.resolve(ch);
        });
    });

    connenction.createChannel().then(function (ch) {
        function remoteMessage(msg) {
            var message = JSON.parse(msg.content.toString());
            if (message.event === 'remote' && message.data && message.userName && message.projectName) {
                if (message.data.name === 'delete') {
                    build.removeBuild(message.userName, message.projectName, message.uid);
                }
            }
        }
        var ok = ch.assertQueue('', {exclusive: true});
        ok = ok.then(function (qok) {
            return ch.bindQueue(qok.queue, 'sharejs-notify', '').then(function () {
                return qok.queue;
            });
        });
        ok = ok.then(function (queue) {
            return ch.consume(queue, remoteMessage, {noAck: true});
        });
    });
}

// Publish delayed task
//
// user - String, user name
// project - String, project name
// key - String, authentication token
// uid - String, current user uid
exports.publishTask = function (user, project, key, uid) {
    exchange.then(function (ex) {
        var optsAutoTask = config.rabbitmq.autoTasks;
        var msg = {
            uid: uid,
            user: user,
            project: project,
            key: key
        };
        ex.publish(optsAutoTask.name, '#', new Buffer(JSON.stringify(msg)), {contentType: 'application/json'});
    });
};

function makeAmqpUri(options) {
    return ['amqp://', encodeURIComponent(options.login), ':', encodeURIComponent(options.password), '@',
        encodeURIComponent(options.host), ':', options.port, '/', encodeURIComponent(options.vhost),
        '?heartbeat=', options.heartbeat
    ].join('');
}

// Start listen queue for process delayed messages
exports.start = function () {

    function reconnect(msg) {
        log.warn('reconnect', msg);
        setTimeout(function () {
            exports.start();
        }, 5000);
    }

    var uri = makeAmqpUri(config.rabbitmq);
    amqp.connect(uri).then(function (conn) {
        log.debug('connect!');
        conn.on('close', function () {
        });
        conn.on('error', reconnect);
        initQueues(conn);
    }, reconnect);
};