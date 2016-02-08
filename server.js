//	Choose of the port
var appPort = 1234;

// Librairies

// Use of Express.js
var express = require('express'), app = express();

// Create the server based on Express.js
var http = require('http')
  , server = http.createServer(app)
//  Use of Socket.IO
  , io = require('socket.io').listen(server);

// Use of Jade
var jade = require('jade');

// Use of diff-match-patch from Google for string analysis
var DiffMatchPatch = require('diff-match-patch');
var dmp = new DiffMatchPatch();

// List of user names
var pseudoArray = []; 

// List of user colors
var colorArray = []; 

// List of messages of the chat
var messages = [];
var idMessage = 0;

// List of indexes of currently seen version for each message
var indexVersion = [];

// Using the dynamic Jade template engines with Express.js 
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set("view options", { layout: false });

//Serve static files such as images, CSS files, and JavaScript files
app.use(express.static(__dirname + '/public'));

// Express Routine (I used PHP for doing this kind of stuff before, way easy here)
app.get('/', function(req, res){
	// Render the main page
  res.render('home.jade');
});

// Start listening to the port
server.listen(appPort);
console.log("Server listening on port " + appPort);

// Handle the socket.io connections
var users = 0; //count the users

io.sockets.on('connection', function (socket) { // First connection
	users += 1; // Add 1 to the count
	reloadUsers(); // Send the count to all the users
	socket.on('message', function (data) { // Broadcast the message to all
		if(pseudoSet(socket))
		{
			
			
			// New massage with his ID and reference texte
			var message = [idMessage, data];
			var firstVersion = [data,"black"];
			var messageToPush = [idMessage,firstVersion];
			messages.push(messageToPush);
			indexVersion.push(0);
			
			var transmit = {date : new Date().toISOString(), pseudo : socket.nickname, message : data, color: stringToRGBColor(socket.nickname),id: idMessage.toString()};
			socket.broadcast.emit('message', transmit);
			
			idMessage++;
			console.log("user "+ transmit['pseudo'] +" said \""+data+"\"");
		}
	});
	socket.on('setPseudo', function (data) { // Assign a name and a color to the user
		if (pseudoArray.indexOf(data) == -1) // Test if the name is already taken
		{
			pseudoArray.push(data);
			socket.nickname = data;
			
			var pseudocolor = stringToRGBColor(data);
			colorArray.push(pseudocolor);
			
			var attribute = {statu: 'ok', color: pseudocolor, nbMessage: messages.length};
			socket.emit('pseudoAttribute', attribute);
			
			console.log("user " + data + " connected");
		}
		else
		{
			// Send the error
			var attribute = {statu: 'error', color: ""};
			socket.emit('pseudoAttribute', attribute);
		}
	});
	socket.on('disconnect', function () { // Disconnection of the client
		users -= 1;
		reloadUsers();
		if (pseudoSet(socket))
		{
			console.log("disconnect...");
			var pseudo = socket.nickname;
			var color = stringToRGBColor(pseudo);
			
			var indexPseudo = pseudoArray.indexOf(pseudo);
			pseudoArray.slice(indexPseudo - 1, 0);
			
			var indexColor = colorArray.indexOf(color);
			colorArray.slice(indexColor - 1, 0);
		}
	});
	socket.on('changeMessage', function(data) {
		var i;
		var currMessage;
		var difference = "";
		
		for (i = 0; i < messages.length; i++) {
			if (messages[i][0] == data['id']) {
				indexVersion[i] = 1;
				var version = [data['message'],data['color']];
				messages[i].push(version);
				currMessage = messages[i];
			}
		}
		
		
		
		difference = seeDifference(currMessage[currMessage.length-2][0],data['message'],data['color']);
		var transmit = {message: difference,id: data['id']};
		socket.broadcast.emit('changeMessage', transmit);
	});
	socket.on('displayOldChange', function(data) {
		var currentIndex = indexVersion[data["id"]];
		console.log("test1 "+currentIndex);
		var i;
		var finalHtml ="";
		for (i = 0; i < messages.length; i++) {
			if (messages[i][0] == data['id']) {
				var currentMessage = messages[i];
				var versionIndex = currentMessage.length - currentIndex;
				console.log("test2 "+versionIndex);
				if (currentMessage.length > 2) {
					if (data["sens"] == 0) {
						if (currentMessage.length == 3) {
							if (currentIndex == 1) {
								finalHtml = currentMessage[1][0];
								indexVersion[data['id']]++;
							}
							else if(currentIndex == 2){
								finalHtml = currentMessage[1][0];
							}
							else if(currentIndex == 0){
								finalHtml = seeDifference(currentMessage[versionIndex -2][0],currentMessage[versionIndex-1][0], currentMessage[versionIndex-1][1]);
								indexVersion[data['id']]++;
							}
						}
						else if (versionIndex > 1) {
							if (currentIndex == 0 || currentIndex == 1) {
								finalHtml = seeDifference(currentMessage[versionIndex -2][0],currentMessage[versionIndex-1][0], currentMessage[versionIndex-1][1]);
								indexVersion[data['id']]+=2;
							}
							else {
								finalHtml = seeDifference(currentMessage[versionIndex -1][0],currentMessage[versionIndex][0], currentMessage[versionIndex][1]);
								indexVersion[data['id']]++;
							}			
						}
						else if (versionIndex == 1) {
							finalHtml = currentMessage[1][0];
						}
					}
					else if (data["sens"] == 1) {
						if (currentMessage.length == 3) {
							if (currentIndex == 1) {
								finalHtml = currentMessage[versionIndex][0];
								indexVersion[data['id']]--;
							}
							else if(currentIndex == 2){
								finalHtml = seeDifference(currentMessage[versionIndex][0],currentMessage[versionIndex+1][0], currentMessage[versionIndex+1][1]);
								indexVersion[data['id']]--;
							}
							else if(currentIndex == 0){
								finalHtml = currentMessage[versionIndex-1][0];
							}
						}
						else if (currentIndex == 0) {
							finalHtml = currentMessage[versionIndex-1][0];						
						}
						else if (currentIndex == 1) {
							finalHtml = currentMessage[versionIndex][0];
							indexVersion[data['id']]--;
						}
						else if (versionIndex < currentMessage.length - 1) {
							finalHtml = seeDifference(currentMessage[versionIndex][0],currentMessage[versionIndex+1][0], currentMessage[versionIndex+1][1]);
							indexVersion[data['id']]--;
						}
					}
				}
				else {
					finalHtml = currentMessage[1][0];
				}
			}
		}
		console.log("test3 "+finalHtml);
		var transmit = {message: finalHtml,id: data['id']};
		socket.emit('changeMessage', transmit);
	});
});
// Return the html with the difference between the new and old text. Suppresion are crossed out and Addition are highlighted
function seeDifference(previousVersion,currVersion, color){
	
	// We use google diff algorithm to get the difference between two string
	// diff_main return an array of differences. Each difference are an array of two elements
	//The first element specifies if it is an insertion (1), a deletion (-1) or an equality (0). 
	//The second element specifies the affected text
	var diffArray = dmp.diff_main(previousVersion, currVersion);
	var finalHtml ="";
	var i;
	for (i = 0; i < diffArray.length; i++) {
		var tmpHtml = diffArray[i][1];
		
		if (diffArray[i][0] == 1) {
			tmpHtml=tmpHtml.bold();
			tmpHtml=tmpHtml.fontsize(3);
			tmpHtml=tmpHtml.fontcolor(color);
		}
		else if (diffArray[i][0] == -1) {
			tmpHtml=tmpHtml.strike();
			tmpHtml=tmpHtml.bold();
			tmpHtml=tmpHtml.fontsize(3);
			tmpHtml=tmpHtml.fontcolor(color);
		}
		finalHtml=finalHtml.concat(tmpHtml);
	}

	return finalHtml;
}

function reloadUsers() { // Send the count of the users to all
	io.sockets.emit('nbUsers', {"nb": users});
}
function pseudoSet(socket) { // Test if the user has a name
	var test;
	if (socket.nickname == null ) test = false;
	else test = true;
	return test;
}

// Get a unique hashcode for a string
function hashCode(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
		// Little operation to get the hashcode, use of the signed left shift
       hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
} 

// Get a color from a string
function stringToRGBColor(str){
	// Get the hashcode
	var hash = hashCode(str);
	
	// Do the simple AND operation between the integer and Black color and covert it into String
    var color = (hash & 0x00FFFFFF).toString(16).toUpperCase();
	
	// If the color is smaller than 6 add some '0'
    return "00000".substring(0, 6 - color.length) + color
}