var static = require('node-static');
var http = require('http');
var file = new(static.Server)();
var app = http.createServer(function (req, res) {
  file.serve(req, res);
}).listen(2012);
/*
	-Principe du server:
		#ROOM[]
		#ClientWait[]

		_onConnect :
			add me IN ClientWait;
			Recherche de partenaire;
		_OnLibert :
			Recherche un partenaire;
		_OnDisconect :
			Add parteneraire IN ClientWait;

		Recherche de partenaire :


*/
var ClientWait = [];
var RoomList = [];
function makeid(){
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    console.log(text);
    if(RoomList.indexOf(text) != -1){
    	text = makeid();
    }
    return text;
}
function getRoom(rooms){
 	var roomName ;
	for(var room in rooms){
		if(room)
			roomName = room.substr(1);
	}
	return roomName;
}
function NeedPeer(socket){
	if(ClientWait.length >= 1){
		var roomName = makeid();
		var partenaire = ClientWait.shift();
		console.log("===>"+partenaire);
		partenaire.join(roomName);
		socket.join(roomName);
		io.sockets.in(roomName).emit('message',"You are in : "+roomName);
		return true;
	}else{
		ClientWait.push(socket);
		return false;
	}
}
var io = require('socket.io').listen(app);
io.sockets.on('connection', function (socket){

	NeedPeer(socket);
	socket.on('disconnect', function(socket) {
		socket.broadcast.to(getRoom(io.sockets.manager.roomClients[socket.id])).emit('message', "Se connard est partie");
		console.log('Got disconnect!');
	});

	socket.on('message', function (message) {
    // For a real app, should be room only (not broadcast)
		socket.broadcast.to(getRoom(io.sockets.manager.roomClients[socket.id])).emit('message', message);
	});

});

