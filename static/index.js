document.addEventListener("DOMContentLoaded", function() {

        const socket = io(); 
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
        });
        
        document.getElementById("seriousBtn").addEventListener("click", function() { // Once User has chosen serious role, add them to seriousUsers Queue
            socket.emit("user_join_serious", username);                
        });
    
        socket.on("increment_funny_queue", function(num) {
            document.getElementById("funnyQueueNum").textContent = "Funny Queue: " + num;
        });
    
        socket.on("increment_serious_queue", function(num) {
            document.getElementById("seriousQueueNum").textContent = "Serious Queue: " + num;
        });
        
    
        // ----- Video Chat functions ----- //
    
        socket.on("users_paired", function() {
            console.log("users_paired being executed now.");
            document.getElementById("home_page").style.visibility = "hidden";
            document.getElementById("video_chat_page").style.visibility = "visible";
    
            funnyVideo = document.getElementById("localVideo");
        
            navigator.mediaDevices.getUserMedia({ video: true, audio: false }) // Requesting access to user's camera and microphone
                    .then(function (stream) {
                        localStream = stream;
                        funnyVideo.srcObject = localStream; // Set the video stream as the source for the <video> element
                        console.log("stream has been created");
                    })
                    .catch(function (error) {
                        console.error('Error accessing camera:', error);
                        console.log("error is getting stream");
                    });
    
            console.log("users_paired now completed.");
        });
    
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



