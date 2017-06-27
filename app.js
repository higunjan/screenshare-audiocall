var config = require("./config/config.json"),
    fs = require('fs'),
    express = require('express'),
    app = express(),
    httpForServerCreate = config.https ? require('https') : require('http');

console.log(config);

var options = {
    key: fs.readFileSync(config.privatekey),
    cert: fs.readFileSync(config.certificate)
};

var secureServer = config.https ? httpForServerCreate.createServer(options, app) : httpForServerCreate.createServer(app);

secureServer.listen(config.port, function () {
    console.log('listening both websocket and HTTPs at port ',config.port);
})

app.use(express.static(__dirname + '/public'));

app.all("*", function (req, res, next) {
    console.log("request :: ", req.url)
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next(); // pass control to the next handler
});



var CHANNELS = {};

var WebSocketServer = require('websocket').server;

new WebSocketServer({
    httpServer: secureServer,
    autoAcceptConnections: false
}).on('request', onRequest);

function onRequest(socket) {
    var origin = socket.origin + socket.resource;

    var websocket = socket.accept(null, origin);
    websocket.on('message', function (message) {
        console.log("websocket.on('message') >>>>>> ", message)
        if (message.type === 'utf8') {
            onMessage(JSON.parse(message.utf8Data), websocket);
        }
    });

    websocket.on('close', function () {
        truncateChannels(websocket);
    });
}

function onMessage(message, websocket) {
    if (message.checkPresence)
        checkPresence(message, websocket);
    else if (message.open)
        onOpen(message, websocket);
    else
        sendMessage(message, websocket);
}

function onOpen(message, websocket) {
    var channel = CHANNELS[message.channel];

    if (channel)
        CHANNELS[message.channel][channel.length] = websocket;
    else
        CHANNELS[message.channel] = [websocket];
}

function sendMessage(message, websocket) {
    message.data = JSON.stringify(message.data);
    var channel = CHANNELS[message.channel];
    if (!channel) {
        console.error('no such channel exists');
        return;
    }

    for (var i = 0; i < channel.length; i++) {
        if (channel[i] && channel[i] != websocket) {
            try {
                channel[i].sendUTF(message.data);
            } catch (e) {}
        }
    }
}

function checkPresence(message, websocket) {
    websocket.sendUTF(JSON.stringify({
        isChannelPresent: !! CHANNELS[message.channel]
    }));
}

function swapArray(arr) {
    var swapped = [],
        length = arr.length;
    for (var i = 0; i < length; i++) {
        if (arr[i])
            swapped[swapped.length] = arr[i];
    }
    return swapped;
}

function truncateChannels(websocket) {
    for (var channel in CHANNELS) {
        var _channel = CHANNELS[channel];
        for (var i = 0; i < _channel.length; i++) {
            if (_channel[i] == websocket)
                delete _channel[i];
        }
        CHANNELS[channel] = swapArray(_channel);
        if (CHANNELS && CHANNELS[channel] && !CHANNELS[channel].length)
            delete CHANNELS[channel];
    }
}