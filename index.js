var util = require('util');
var EventEmitter = require('events').EventEmitter;
var mqtt = require('mqtt');
var debug = require('debug')('meshblu-meshlium');
var parseString = require('xml2js').parseString;
var _ = require('lodash');

var MESSAGE_SCHEMA = {
  type: 'object',
  properties: {
  }
};

var OPTIONS_SCHEMA = {};

function Plugin(){
  this.options = {};
  this.messageSchema = MESSAGE_SCHEMA;
  this.optionsSchema = OPTIONS_SCHEMA;
  return this;
}
util.inherits(Plugin, EventEmitter);

Plugin.prototype.onMessage = function(message){
  if(!this.server){
    return;
  }
  this.server.publish({topic: message.topic, qos: 0, payload: message.payload, retain: false});
};

Plugin.prototype.setOptions = function(options){
  var plugin = this;

  var publish = _.throttle(function(packet) {
    debug("calling emit publish!");
    plugin.emit('message', { topic: 'message', devices: '*', payload: packet.payload });
  }, 100);

  this.options = options;

  if (this.server) {
    debug("restarting mqtt server on new config options!");
    this.server.close();
  }

  this.server = mqtt.createServer(function(client) {
    var self = this;

    if (!self.clients) self.clients = {};

    client.on('connect', function(packet) {
      client.connack({returnCode: 0});
    });

    client.on('publish', function(packet) {
      debug('publishing! ',packet);
      parseString(packet.payload, function (error, result) {
        if (!error) {
          packet.payload = result;
        }
      });

      publish(packet);

      if (packet.qos === 2) {
        client.puback({messageId: packet.messageId});
      }
    });

    client.on('subscribe', function(packet) {
      client.suback({granted: granted, messageId: packet.messageId});
    });

    client.on('pingreq', function(packet) {
      client.pingresp();
    });

    client.on('disconnect', function(packet) {
      client.stream.end();
    });

    client.on('close', function(err) {
      delete self.clients[client.id];
    });

    client.on('error', function(err) {
      console.log('error!', err);

      if (!self.clients[client.id]) return;

      client.stream.end();
      console.dir(err);
    });

  }).listen(process.argv[2] || 1884);

};

module.exports = {
  messageSchema: MESSAGE_SCHEMA,
  optionsSchema: OPTIONS_SCHEMA,
  Plugin: Plugin
};
