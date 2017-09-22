/* jshint eqeqeq:false,eqnull:true,node:true */

var winston = require('winston');

var log = new(winston.Logger)({
  level: 'debug',
  transports: [
    new(winston.transports.Console)({
      colorize: true,
      timestamp: true
    })
  ]
});

var sensor = new(winston.Logger)({
  level: 'info',
  transports: [
    new(winston.transports.File)({
      filename: require('path').join(__dirname, 'logs/sensor.log')
    })
  ]
});

var raspi = require('node-raspi');

function AWS_DynamoDB(credentialsPath, hostname) {
  var that = this;
  var AWS = require('aws-sdk'); // import entire SDK
  AWS.config.loadFromPath(credentialsPath);

  var docClient = new AWS.DynamoDB.DocumentClient();

  return {
    "write": function(tablename, payload, callback) {
      var params = {};
      params.TableName = tablename;
      params.Item = payload;
      docClient.put(params, function(err, data) {
        if (callback) {
          callback(err, data);
        }
      });
    }
  };
}

var dynamodb = new AWS_DynamoDB('./credentials.json');
var hostname = hostname || require('os').hostname();
var currentTime = new Date();

function sendPayload() {
  currentTime = new Date();
  var payload = {
    "timestamp": currentTime.getTime(),
    "timestampJSON": currentTime.toJSON(),
    "hostname": hostname,
    "cputemp": raspi.getThrm()
  };
  log.info(payload);
  sensor.info(payload);

  //latest to raspberry
  dynamodb.write("raspberry", payload);

  //append to raspberry
  dynamodb.write("raspberry-logs", payload);
}

var sensorInterval = 60 * 5; //five minutes
sensorInterval = 30; // 2 seconds

var __initInterval = setInterval(sendPayload, sensorInterval * 1000);
sendPayload(); //init once

//clearInterval(__initInterval);
log.info("Set interval read for seconds:" + sensorInterval);