document.addEventListener("DOMContentLoaded", (event) => {

    var protocol = window.location.protocol;
    var socket = io(protocol + '//' + document.domain + ':' + location.port, {autoConnect: true});
    var username;
    var role;

    // ---------- Home ---------- //

    document.getElementById("funnyBtn").addEventListener("click", function() { // Once User has chosen funny role, add them to funnyUsers Queue
        socket.emit("user_join_funny", username);
        role = "funny";
    });
    
    document.getElementById("seriousBtn").addEventListener("click", function() { // Once User has chosen serious role, add them to seriousUsers Queue
        socket.emit("user_join_serious", username);
        role = "serious";          
    });

    socket.on("get_funny_queue", function(num) {
        document.getElementById("funnyQueueNum").textContent = "Funny Queue: " + num;
    });

    socket.on("get_serious_queue", function(num) {
        document.getElementById("seriousQueueNum").textContent = "Serious Queue: " + num;
    });

    // ---------- Web-RTC ---------- //

    var myID;
    var targetID;
    var room;
    var mediaConstraints = { audio: false, video: true };

    socket.on("redirect_to_video", function() {
        document.getElementById("home_page").style.visibility = "hidden";
        document.getElementById("video_chat_page").style.visibility = "visible";
    });

    function sendToServer(msg) {
        socket.emit("data", msg);
    }

    socket.on("users_paired", function(data) {

        myID = data['myID'];
        targetID = data['targetID'];
        room = data['room'];

        createPeerConnection();

        navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then((localStream) => {
            if (role == "funny") {
                document.getElementById("funnyVideo").srcObject = localStream;
            } else {
                document.getElementById("seriousVideo").srcObject = localStream;
            }
            localStream.getTracks().forEach((track) => myPeerConnection.addTrack(track, localStream));
        })
    });

    function createPeerConnection() {

        myPeerConnection = new RTCPeerConnection({
            iceServers: [{
                urls: [ "stun:us-turn8.xirsys.com" ]
                }, {
                username: "VcPom22kSQlvPJ1FRMjb5qXw8-sSdYPFdhiLq3NMGzc-imBAUGSNLKmGhYnbKf_eAAAAAGTbqk9FcGlwaG9uZTE5OTY=",
                credential: "565fb534-3b8a-11ee-a7b9-0242ac140004",
                urls: [
                    "turn:us-turn8.xirsys.com:80?transport=udp",
                    "turn:us-turn8.xirsys.com:3478?transport=udp",
                    "turn:us-turn8.xirsys.com:80?transport=tcp",
                    "turn:us-turn8.xirsys.com:3478?transport=tcp",
                    "turns:us-turn8.xirsys.com:443?transport=tcp",
                    "turns:us-turn8.xirsys.com:5349?transport=tcp"
                ]
                }
            ],
        });

        myPeerConnection.onicecandidate = handleICECandidateEvent;
        myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;

        myPeerConnection.addEventListener('track', async (event) => {
            const [remoteStream] = event.streams;

            if (role == "funny") {
                document.getElementById("seriousVideo").srcObject = remoteStream;
            } else {
                document.getElementById("funnyVideo").srcObject = remoteStream;
                detectSmile();
            }
        });
    }

    function handleNegotiationNeededEvent() {

        myPeerConnection
            .createOffer()
            .then((offer) => myPeerConnection.setLocalDescription(offer))
            .then(() => {
                sendToServer({
                    name: myID,
                    target: targetID,
                    type: "video-offer",
                    sdp: myPeerConnection.localDescription,
                });
            })
    }

    function handleICECandidateEvent(event) {

        if (event.candidate) {
            sendToServer({
            type: "new-ice-candidate",
            target: targetID,
            candidate: event.candidate,
            });
        }
    }

    socket.on("handleNewIceCandidateMsg", function(msg) {
        
        const candidate = new RTCIceCandidate(msg.candidate);      
        myPeerConnection.addIceCandidate(candidate);
    });

    socket.on("handleVideoOfferMsg", function(msg) {
        
        let localStream = null;
        
        myID = msg.target;
        targetID = msg.name;
        
        createPeerConnection();

        const desc = new RTCSessionDescription(msg.sdp);
        
        myPeerConnection
            .setRemoteDescription(desc)
            .then(() => navigator.mediaDevices.getUserMedia(mediaConstraints))
            .then((stream) => {
            localStream = stream;
            if (role == "funny") {
                document.getElementById("funnyVideo").srcObject = localStream;
            } else {
                document.getElementById("seriousVideo").srcObject = localStream;
            }   
            localStream.getTracks().forEach((track) => myPeerConnection.addTrack(track, localStream));
            })
            .then(() => myPeerConnection.createAnswer())
            .then((answer) => myPeerConnection.setLocalDescription(answer))
            .then(() => {
            sendToServer({
                name: myID,
                target: targetID,
                type: "video-answer",
                sdp: myPeerConnection.localDescription,
                });
            })
    });

    socket.on("handleVideoAnswerMsg", function(msg) {

        let desc = new RTCSessionDescription(msg.sdp);
        myPeerConnection.setRemoteDescription(desc);
    });

    // ---------- Video-Chat ---------- //

    document.getElementById("disconnectBtn").addEventListener("click", function() { 
        socket.emit("disconnect_user", room);
    });
    
    socket.on("user_left", function() { 

        const funnyStream = document.getElementById("funnyVideo").srcObject;
        const seriousStream = document.getElementById("seriousVideo").srcObject;       
        const funnyTracks = funnyStream.getTracks();
        const seriousTracks = seriousStream.getTracks();

        funnyTracks[0].stop();
        seriousTracks[0].stop();

        myPeerConnection.close();

        document.getElementById("home_page").style.visibility = "visible";
        document.getElementById("video_chat_page").style.visibility = "hidden";
    });
    
    document.getElementById("message").addEventListener("keyup", function(event) {
        if (event.key == "Enter") {
            let message = document.getElementById("message").value;
            socket.emit("new_message", message);
            document.getElementById("message").value = "";
        }
    });
    
    socket.on("chat", function (data) {
        let ul = document.getElementById("chat-messages");
        let li = document.createElement("li");
        li.style.listStyleType = "none";
        li.appendChild(document.createTextNode(data["username"] + ": " + data["message"]));
        ul.appendChild(li);
        ul.scrolltop = ul.scrollHeight;
    });

    socket.on('endRound', function() {
        const funnyStream = document.getElementById("funnyVideo").srcObject;
        const seriousStream = document.getElementById("seriousVideo").srcObject;       
        const funnyTracks = funnyStream.getTracks();
        const seriousTracks = seriousStream.getTracks();

        funnyTracks[0].stop();
        seriousTracks[0].stop();
    });

    // ---------- Smile-Detection ---------- //

    async function detectSmile() {

        console.log('detectSmile() executing...');
        try {
            const videoElement = document.getElementById('seriousVideo');

            //await faceapi.nets.tinyFaceDetector.loadFromUri('../static/models');
            await faceapi.nets.faceRecognitionNet.loadFromUri('../static/models');
            await faceapi.nets.faceExpressionNet.loadFromUri('../static/models');
            await faceapi.nets.ssdMobilenetv1.loadFromUri('../static/models');
            console.log('Models Loaded');

            const canvas = await faceapi.createCanvasFromMedia(videoElement);
            
            document.body.append(canvas);

            const displaySize = { width: videoElement.width, height: videoElement.height };
            await faceapi.matchDimensions(canvas, displaySize);
            //const options = new faceapi.TinyFaceDetectorOptions({scoreThreshold: 0.15})
            const options = new faceapi.SsdMobilenetv1Options({minConfidence: 0.1})
            const canvasContext = canvas.getContext('2d', { willReadFrequently: true })
            console.log('Commencing Face Detection');
            setInterval(async () => {
                try {
                    let detections = await faceapi.detectAllFaces(videoElement, options).withFaceExpressions();
                    let resizedDetections = await faceapi.resizeResults(detections, displaySize);
                    await canvasContext.clearRect(0, 0, canvas.width, canvas.height);
                    await faceapi.draw.drawDetections(canvas, resizedDetections);
                    await faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

                    if (detections && detections[0] && detections[0].expressions.happy > 0.99) {
                        console.log('Happy Emotion Detected');
                        //socket.emit("userSmiled", room);
                    }
                }
                catch (Exception) {
                    console.log('Detection Error!:' + Exception.toString())
                }                
            }, 80)
        }
        catch (Exception) {
            console.log('Canvas Error!:' + Exception.toString());
        }
    }


});