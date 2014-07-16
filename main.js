

// A testé en ligne
var pc_config = {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}]};

/**
@description
Media demander au createAnswer
@type {RTCSessionDescription}
*/
var sdpConstraints = {'mandatory': {
				'OfferToReceiveAudio':true,
				'OfferToReceiveVideo':true }};
/**
@description
Tableau des connexion RTCPeerConnection avec leur id serveur,
pour les échanges de connexion initial.
@type	  {Array}
 */
var p2p = Array();

/**
@description
Notre [socket] de connexion avec le cserveur
@type	  {socket.io}
*/
var socket = null;

/**
@description
Stream du [UserMedia] local
@type	  {UserMedia}
*/
var localStream ;

/**
@description
Dom de au quelle est affecter localStream
@type {dom}
*/
var localVideo = $("#localVideo")[0];

/**
@description
Room de connexion avec le serveur
@type	  {string}
*/
var room = "toto";

/**
@description
@param {integer|RTCPeerConnection} search
@return {RTCPeerConnection|socket_id}
*/
function getP2p (search){
	for (var i = 0; i < p2p.length; i++) {
		if(p2p[i][0] == search) return p2p[i][1];
		if(p2p[i][1] == search) return p2p[i][0];
	};
}
	
/**
@description
Création d'une [RTCPeerConnection] suite a un message du serveur.
@param {intenger} socket_id - socket id du client sur le serveur
@param {boolean}  type	 	- Création(true) ou reception(false) d'une offre
@param {offer} 	  offer 	- Création d'une offre ou reception
@return {RTCPeerConnection}
*/	
var creatP2P = function(socket_id,offer,type){
	try {
		//Création d'une connexion vide
		var p2pConnexion = new RTCPeerConnection(null);
		//Listener
		p2pConnexion.onicecandidate = onicecandidate;
		p2pConnexion.onaddstream = handleRemoteStreamAdded;
		p2pConnexion.onremovestream = handleRemoteStreamRemoved;
		//On lie le stream local de UserMedia
		p2pConnexion.addStream(localStream);
		//Ajoute de la nouvelle connexion
		p2p.push(Array(socket_id,p2pConnexion));
		//Si On est l'iniateur de la connexion on créer une offre,
		//Qui passera par le serveur
		if(type){
			p2pConnexion.createOffer(
				function(sessionDescription){
					// Set Opus as the preferred codec in SDP if Opus is present.
					sessionDescription.sdp = preferOpus(sessionDescription.sdp);
					p2pConnexion.setLocalDescription(sessionDescription);
					console.log('setLocalAndSendMessage sending message' , sessionDescription);
					socket.emit('p2p', [socket_id,sessionDescription]);
				},
				function(){
					alert("creatOffert bug !!");
				}
			);
		}else{
			p2pConnexion.setRemoteDescription(new RTCSessionDescription(offer));
			p2pConnexion.createAnswer(
				function(sessionDescription){
					sessionDescription.sdp = preferOpus(sessionDescription.sdp);
					p2pConnexion.setLocalDescription(sessionDescription);
					console.log('setLocalAndSendMessage sending data' , sessionDescription);
					socket.emit('p2p', [socket_id,sessionDescription]);
				},
				null,
				sdpConstraints
			);
		}
		return p2pConnexion;
	} catch (e) {
		alert('Cannot create RTCPeerConnection object.');
		return [];
	}
}

/**
@description
Appeler par la RTCPeerConnection avec notre peer.
Echange NAT
@param {event} event - event candidate donner par [RTCPeerConnection]
*/
var onicecandidate = function (event) {
	console.log('handleIceCandidate event: ', event);
	if (event.candidate) {
		socket.emit('p2p', [getP2p(event.currentTarget),{
		type: 'candidate',
		label: event.candidate.sdpMLineIndex,
		id: event.candidate.sdpMid,
		candidate: event.candidate.candidate}]);
	} else {
		console.log('End of candidates.');
	}
};

/**
@description
Appeler par la RTCPeerConnection avec notre peer.
Ajoute d'un stream [userMedia] par notre peer.
@param {event} event - event [userMedia] donner par [RTCPeerConnection]
*/
var handleRemoteStreamAdded = function(event) {
	//Ajout d'un DOM
	$("#listVideo").append('<video autoplay></video>');
	$("video:last-child")[0].src = window.URL.createObjectURL(event.stream);
	//remoteStream = event.stream;
	UpdateDom();
}
function UpdateDom(){
	if($("#listVideo video").length > 0){
		$("#wait").hide();
		$("#listVideo").attr("class","");
		$("#listVideo").attr("class","x"+$("#listVideo video").length);
	}else{
		$("#listVideo").attr("class","");
		$("#wait").show();
	}
}
/**
@description
Appeler par la RTCPeerConnection avec notre peer.
Supression d'un stream [userMedia] par notre peer.
@param {event} event - event [userMedia] donner par [RTCPeerConnection]
*/
var handleRemoteStreamRemoved = function(event) {
  console.log('Remote stream removed. Event: ', event);
}

/**
@description
Connexion au serveur, ont rejoin une room.
Ecoute des diférent événement (chaque message reçut est lié a un type d'événement)<br>
	-connect<br>
	-new_client<br>
	-joined<br>
	-full<br>
	-p2p<br>
@see creatP2P
@see echangeP_S_P
*/
var ConnectServer =  function(){
	socket = io.connect();
	//Connexion au serveur
	socket.on('connect', function (){
	  socket.emit("join",room);//On rejoind une room
	});
	//Definition des listener
	socket.on('new_client',function(socket_id){ 
		//On lance la création d'une connexiont p2p
		var pc = creatP2P(socket_id,null,true);
	});
	socket.on('joined',function(){
		//Changement de page ...
	});
	socket.on('full',function(){
		//Affiche la room es plein;
		alert("Room full");
	});
	socket.on('p2p', echangeP_S_P);
}

/**
@description
Echange entre une pair le serveur et une peer
Pour l'initialisation d'une connexion RTCPeerConnection
@param {array} data - Tableau [socket_id,message]
*/
var echangeP_S_P =function (data){
	//On recupere le
	var pc = getP2p(data[0]);
	// reception d'une offre
	if (data[1].type === 'offer') {
		//creation d'une connexion P2P
		var p2pConnexion = creatP2P(data[0],data[1],false); 
	// Reponse d'une offre
	} else if (data[1].type === 'answer') {
		//On enregistre
		pc.setRemoteDescription(new RTCSessionDescription(data[1]));
	} else if (data[1].type === 'candidate') {
		var candidate = new RTCIceCandidate({
		sdpMLineIndex: data[1].label,
		candidate: data[1].candidate
		});
		pc.addIceCandidate(candidate);
	}
};

/******************************************************
					LOCAL STREAM
*******************************************************/
//Demande d'utilisation de la caméra
getUserMedia({video: true,audio: true}, userMediaOn, UserMediaFail);
//Demande accepter 
function userMediaOn(stream) {
  console.log('Ajout du stream LOCAL.');
  localVideo.src = window.URL.createObjectURL(stream);
  localStream = stream;
  if (socket == null) {
    ConnectServer();
  }
}
//Demander en echec
function UserMediaFail (error){
		console.log('getUserMedia error: ', error);
}
if (location.hostname != "localhost") {
  requestTurn('https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913');
}



function requestTurn(turn_url) {
  var turnExists = false;
  for (var i in pc_config.iceServers) {
    if (pc_config.iceServers[i].url.substr(0, 5) === 'turn:') {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log('Getting TURN server from ', turn_url);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(){
      if (xhr.readyState === 4 && xhr.status === 200) {
        var turnServer = JSON.parse(xhr.responseText);
      	console.log('Got TURN server: ', turnServer);
        pc_config.iceServers.push({
          'url': 'turn:' + turnServer.username + '@' + turnServer.turn,
          'credential': turnServer.password
        });
        turnReady = true;
      }
    };
    xhr.open('GET', turn_url, true);
    xhr.send();
  }
}

///////////////////////////////////////////

// Set Opus as the default audio codec if it's present.
function preferOpus(sdp) {
  var sdpLines = sdp.split('\r\n');
  var mLineIndex;
  // Search for m line.
  for (var i = 0; i < sdpLines.length; i++) {
      if (sdpLines[i].search('m=audio') !== -1) {
        mLineIndex = i;
        break;
      }
  }
  if (mLineIndex === null) {
    return sdp;
  }

  // If Opus is available, set it as the default in m line.
  for (i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search('opus/48000') !== -1) {
      var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
      if (opusPayload) {
        sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
      }
      break;
    }
  }

  // Remove CN in m line and sdp.
  sdpLines = removeCN(sdpLines, mLineIndex);

  sdp = sdpLines.join('\r\n');
  return sdp;
}

function extractSdp(sdpLine, pattern) {
  var result = sdpLine.match(pattern);
  return result && result.length === 2 ? result[1] : null;
}

// Set the selected codec to the first in m line.
function setDefaultCodec(mLine, payload) {
  var elements = mLine.split(' ');
  var newLine = [];
  var index = 0;
  for (var i = 0; i < elements.length; i++) {
    if (index === 3) { // Format of media starts from the fourth.
      newLine[index++] = payload; // Put target payload to the first.
    }
    if (elements[i] !== payload) {
      newLine[index++] = elements[i];
    }
  }
  return newLine.join(' ');
}

// Strip CN from sdp before CN constraints is ready.
function removeCN(sdpLines, mLineIndex) {
  var mLineElements = sdpLines[mLineIndex].split(' ');
  // Scan from end for the convenience of removing an item.
  for (var i = sdpLines.length-1; i >= 0; i--) {
    var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
    if (payload) {
      var cnPos = mLineElements.indexOf(payload);
      if (cnPos !== -1) {
        // Remove CN payload from m line.
        mLineElements.splice(cnPos, 1);
      }
      // Remove CN line in sdp
      sdpLines.splice(i, 1);
    }
  }

  sdpLines[mLineIndex] = mLineElements.join(' ');
  return sdpLines;
}