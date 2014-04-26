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

var amqp = require('amqp');
var config = require('../config');
var q = require('q');

var connection = null;
var exchange = null;

function initQueues(connenction) {
    var optsTask = config.rabbitmq.tasks;
    connenction.queue(optsTask.name, optsTask, function (queue) {
        queue.subscribe({
            ack: true,
            prefetchCount: 10
        }, function (msgs, headers, deliveryInfo, ack) {

            console.log('msgs', msgs);
            ack.acknowledge(false);

        });
    });

    var def = q.defer();
    exchange = def.promise;
    var optsAutoTask = config.rabbitmq.autoTasks;
    connenction.exchange(optsAutoTask.name, optsAutoTask, function (ex) {
        def.resolve(ex);
    });
}

exports.publishTask = function (user, project, key, type) {
    exchange.then(function (ex) {
        var msg = {
            type: type,
            user: user,
            project: project,
            key: key
        };
        ex.publish('#', msg, {contentType: 'application/json'});
    });
};

exports.start = function () {
    var def = q.defer();
    connection = def.promise;
    var conn = amqp.createConnection(config.rabbitmq)
        .once('ready', function () {
            initQueues(conn);
            def.resolve(conn);
        }).once('error', def.reject);
};