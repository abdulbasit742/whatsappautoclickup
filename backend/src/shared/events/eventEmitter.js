const EventEmitter = require('events');

class AppEventEmitter extends EventEmitter {}

const emitter = new AppEventEmitter();
emitter.setMaxListeners(50);

module.exports = emitter;
