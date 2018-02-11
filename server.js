var static = require('node-static');
var http = require('http');
var file = new(static.Server)();
var app = http.createServer(function (req, res) {
  file.serve(req, res);
}).listen(2012);
/*
	vizeocall.com
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

function getRoom(rooms){
 	var roomName ;
	for(var room in rooms){
		if(room)
			roomName = room.substr(1);
	}
	return roomName;
}
var io = require('socket.io').listen(app);
io.sockets.on('connection', function (socket){
	socket.on("join",function(room){
		var numClients = io.sockets.clients(room).length;
		if(numClients > 6){
			socket.emit("full");
			console.log("## ROOM FULL '"+room+"'! ##");
		}else{
			socket.join(room);
			socket.emit("joined");
			console.log("## JOIN ROM '"+room+"'! ##");
			if(numClients>0){
				socket.broadcast.to(getRoom(io.sockets.manager.roomClients[socket.id])).emit('new_client', socket.id);
			}
		}
	});
	socket.on('p2p',function(tab){
		socket_id = tab[0];
		message = tab[1];
		io.sockets.socket(socket_id).emit('p2p',[socket.id,message]);
	});
	socket.on('disconnect', function(socket) {
		socket.broadcast.to(getRoom(io.sockets.manager.roomClients[socket.id])).emit('client_left', socket.id);
		console.log('## disconnect! ##');
	});


});
//test

