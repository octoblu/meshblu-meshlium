var util = require('util');
var EventEmitter = require('events').EventEmitter;
var mosca = require('mosca');
var debug = require('debug')('meshblu-meshlium');

var MESSAGE_SCHEMA = {
  type: 'object',
  properties: {
    exampleBoolean: {
      type: 'boolean',
      required: true
    },
    exampleString: {
      type: 'string',
      required: true
    }
  }
};

var OPTIONS_SCHEMA = {
  type: 'object',
  properties: {
    firstExampleOption: {
      type: 'string',
      required: true
    }
  }
};

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
  var self = this;

  this.options = options;
  this.server = new mosca.Server({});

  this.server.on('ready', function(){
    debug('Mosca server is up and running.');
  });

  this.server.on('clientConnected', function(client){
    debug('clientConnected', client.id);
  })

  this.server.on('clientDisconnected', function(client){
    debug('clientDisonnected', client.id);
  })

  this.server.on('published', function(packet, client){
    if(!client){
      return;
    }

    debug('published', client.id, packet.topic, packet.payload.toString());
    self.emit({devices: '*', topic: packet.topic, payload: packet.payload.toString()});
  });
};

module.exports = {
  messageSchema: MESSAGE_SCHEMA,
  optionsSchema: OPTIONS_SCHEMA,
  Plugin: Plugin
};
