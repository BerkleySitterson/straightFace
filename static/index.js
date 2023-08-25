document.addEventListener("DOMContentLoaded", function() {

    var userID;
    var peerID;
    var role;
    var peerConnection;
    
    
    var protocol = window.location.protocol;
    var socket = io(protocol + '//' + document.domain + ':' + location.port, {autoConnect: true});
    var username;
        
        // ----- Landing Page functions ----- // 
    
        document.getElementById("index_login").addEventListener("click", function() {
            document.getElementById("landing_page").style.visibility = "hidden";
            document.getElementById("login_page").style.visibility = "visible";
        });
    
        document.getElementById("index_register").addEventListener("click", function() {
            document.getElementById("landing_page").style.visibility = "hidden";
            document.getElementById("register_page").style.visibility = "visible";
        });
    
        // ----- Login Page functions ----- // 
    
        document.getElementById("login_button").addEventListener("click", function() {
            username = document.getElementById("login_username").value;
            let password = document.getElementById("login_password").value;
            socket.emit("login", username, password);
        });
    
        socket.on("login_successful", function() {
            document.getElementById("login_page").style.visibility = "hidden";
            document.getElementById("home_page").style.visibility = "visible";
            document.getElementById("username_display").textContent = username;
        });
    
        socket.on("login_failed", function() {
            document.getElementById("login_error_message").value = "Login Failed, check your username and password.";
        });
    
        // ----- Register Page functions ----- //
    
        document.getElementById("register_button").addEventListener("click", function() {
            let username = document.getElementById("register_username").value;
            let password = document.getElementById("register_password").value;
            let email = document.getElementById("register_email").value;
            let first_name = document.getElementById("register_first_name").value;
            let last_name = document.getElementById("register_last_name").value;
            socket.emit("register", username, password, email, first_name, last_name);
        });
    
        socket.on("register_successful", function() {
            document.getElementById("register_page").style.visibility = "hidden";
            document.getElementById("landing_page").style.visibility = "visible";
        });
    
        socket.on("register_failed", function() {
            document.getElementById("register_error_message").value = "Register Failed, please enter all required fields.";
        });
    
        // ----- Home Functions ----- //
    
        document.getElementById("funnyBtn").addEventListener("click", function() { // Once User has chosen funny role, add them to funnyUsers Queue
            socket.emit("user_join_funny", username);
            role = "funny";
        });
        
        document.getElementById("seriousBtn").addEventListener("click", function() { // Once User has chosen serious role, add them to seriousUsers Queue
            socket.emit("user_join_serious", username);
            role = "serious";          
        });
    
        socket.on("increment_funny_queue", function(num) {
            document.getElementById("funnyQueueNum").textContent = "Funny Queue: " + num;
        });
    
        socket.on("increment_serious_queue", function(num) {
            document.getElementById("seriousQueueNum").textContent = "Serious Queue: " + num;
        });
        
    
        // ----- Video Chat functions ----- //

        socket.on("videoRedirect", function() {
            console.log("videoRedirect being executed now.");

            document.getElementById("home_page").style.visibility = "hidden";
            document.getElementById("video_chat_page").style.visibility = "visible";
            startCamera();

            console.log("videoRedirect now complete.");
        });
    
        socket.on("users_paired", function(data) {
            console.log("users_paired being executed now.");

            userID = data["userID"];
            peerID = data["peerID"];

            invite(peerID);

            console.log("users_paired now completed.");
        });

        var camera_allowed=false; 
        var mediaConstraints = {
            audio: false,
            video: true
        };


        function startCamera() 
        {           
            let funnyVideo = document.getElementById("funnyVideo");
            let seriousVideo = document.getElementById("seriousVideo");

            navigator.mediaDevices.getUserMedia(mediaConstraints)
            .then((stream)=>{

                if (role == "funny") {
                    funnyVideo.srcObject = stream;
                    camera_allowed = true;
                    socket.connect();
                } 
                else if (role == "serious") {
                    seriousVideo.srcObject = stream;
                    camera_allowed = true;
                    socket.connect();
                }
            })
            .catch((e)=>{
                console.log("getUserMedia Error! ", e);
            });
        }

        var PC_CONFIG = {
            iceServers: [
                {
                    urls: ['stun:stun.l.google.com:19302', 
                            'stun:stun1.l.google.com:19302',
                            'stun:stun2.l.google.com:19302',
                            'stun:stun3.l.google.com:19302',
                            'stun:stun4.l.google.com:19302'
                        ]
                },
            ]
        };

        function log_error(e){console.log("[ERROR] ", e);}
        function sendViaServer(data){socket.emit("data", data);}

        socket.on("data", (msg)=>{
            switch(msg["type"])
            {
                case "offer":
                    handleOfferMsg(msg);
                    break;
                case "answer":
                    handleAnswerMsg(msg);
                    break;
                case "new-ice-candidate":
                    handleNewICECandidateMsg(msg);
                    break;
            }
        });

        const sleep = ms => new Promise(r => setTimeout(r, ms));

        async function invite(peerID) {
            console.log(`Creating peer connection for <${peerID}> ...`);
            peerConnection = createPeerConnection(); // Assign to the global peerConnection variable
            await sleep(10000);
        
            if (role == "funny") {
                let local_stream = funnyVideo.srcObject;
                local_stream.getTracks().forEach((track) => {
                    peerConnection.addTrack(track, local_stream);
                });
            } else if (role == "serious") {
                let local_stream = seriousVideo.srcObject;
                local_stream.getTracks().forEach((track) => {
                    peerConnection.addTrack(track, local_stream);
                });
            }
        }

        function createPeerConnection() {
            const peerConnection = new RTCPeerConnection(PC_CONFIG);
        
            peerConnection.onicecandidate = (event) => {
                handleICECandidateEvent(event, peerConnection);
            };
            peerConnection.ontrack = (event) => {
                handleTrackEvent(event, peerConnection);
            };
            peerConnection.onnegotiationneeded = () => {
                handleNegotiationNeededEvent(peerConnection);
            };
        
            console.log('PeerConnection being returned: ' + peerConnection);
            return peerConnection;
        }

        function handleNegotiationNeededEvent(peerConnection) { // Change parameter name to pc
            peerConnection.createOffer()
                .then((offer) => {
                    return peerConnection.setLocalDescription(offer);
                })
                .then(() => {
                    console.log(`sending offer to <${peerID}> ...`);
                    sendViaServer({
                        "sender_id": userID,
                        "target_id": peerID,
                        "type": "offer",
                        "sdp": peerConnection.localDescription // Use pc.localDescription here
                    });
                })
                .catch(log_error);
        }

        function handleOfferMsg(msg)
        {   
            

            let peer_id = msg['sender_id'];

            console.log(`offer recieved from <${peer_id}>`);
            
            peerConnection = createPeerConnection(peer_id);
            let desc = new RTCSessionDescription(msg['sdp']);
            console.log('Description: ' + desc.toString());
            console.log('Peer Conenction: ' + peerConnection.toString());
            peerConnection.setRemoteDescription(desc)
            .then(()=>{
                if (role == "funny") {
                    let local_stream = funnyVideo.srcObject;
                    local_stream.getTracks().forEach((track)=>{peerConnection.addTrack(track, local_stream);});                   
                } 
                else if (role == "serious") {
                    let local_stream = seriousVideo.srcObject;
                    local_stream.getTracks().forEach((track)=>{peerConnection.addTrack(track, local_stream);});            
                }
            })
            .then(()=>{return peerConnection.createAnswer();})
            .then((answer)=>{return peerConnection.setLocalDescription(answer);})
            .then(()=>{
                console.log(`sending answer to <${peer_id}> ...`);
                sendViaServer({
                    "sender_id": userID,
                    "target_id": peer_id,
                    "type": "answer",
                    "sdp": peerConnection.localDescription
                });
            })
            .catch(log_error);
        }

        function handleAnswerMsg(msg)
        {
            peerID = msg['sender_id'];
            console.log(`answer recieved from <${peerID}>`);
            let desc = new RTCSessionDescription(msg['sdp']);
            peerConnection.setRemoteDescription(desc)
        }

        function handleICECandidateEvent(event, peerID)
        {
            if(event.candidate){
                sendViaServer({
                    "sender_id": userID,
                    "target_id": peerID,
                    "type": "new-ice-candidate",
                    "candidate": event.candidate
                });
            }
        }

        function handleNewICECandidateMsg(msg) {
            // Use peerConnection instead of peerID here
            console.log(`ICE candidate received from <${msg['sender_id']}>`);
            var candidate = new RTCIceCandidate(msg.candidate);
            peerConnection.addIceCandidate(candidate) // Use peerConnection
                .catch(log_error);
        }

        function handleTrackEvent(event, peerID)
        {
            console.log(`Track event recieved from <${peerID}>`);
            let funnyVideo = document.getElementById("funnyVideo");
            let seriousVideo = document.getElementById("seriousVideo");
            console.log('293');

            if(event.streams)
            {
                if (role == "funny") {
                    seriousVideo.srcObject = event.streams[0];
                    console.log('Serious Video being populated.');
                } 
                else if (role == "serious") {
                    funnyVideo.srcObject = event.streams[0];
                    console.log('303');
                }
            }
        }

    
        document.getElementById("disconnectBtn").addEventListener("click", function() { // When 'disconnectBtn' is clicked, it lets the server know, displays the landing-page, and stops the video stream
            socket.emit("disconnect_user")
        
        });
        
        socket.on("user_left", function() { // When partner has left, diplay landing page and stop video/audio
            document.getElementById("landing_page").style.display = "block";
            document.getElementById("video_chat_page").style.display = "none";
        
        });
        
        document.getElementById("message").addEventListener("keyup", function(event) { // When user clicks 'enter' key, their message is sent to flask server and then returned to null
            if (event.key == "Enter") {
                let message = document.getElementById("message").value;
                socket.emit("new_message", message);
                document.getElementById("message").value = "";
            }
        });
        
        socket.on("chat", function (data) { // Recieves message from server and displays it to all users in a specific room
            let ul = document.getElementById("chat-messages");
            let li = document.createElement("li");
            li.style.listStyleType = "none";
            li.appendChild(document.createTextNode(data["username"] + ": " + data["message"]));
            ul.appendChild(li);
            ul.scrolltop = ul.scrollHeight;
        });
});



