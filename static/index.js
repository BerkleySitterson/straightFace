document.addEventListener("DOMContentLoaded", (event) => {
        
    // ---------- Index ---------- //

    document.getElementById("index_login").addEventListener("click", function() {
        document.getElementById("landing_page").style.visibility = "hidden";
        document.getElementById("login_page").style.visibility = "visible";
    });

    document.getElementById("index_register").addEventListener("click", function() {
        document.getElementById("landing_page").style.visibility = "hidden";
        document.getElementById("register_page").style.visibility = "visible";
    });

    // ---------- Login ---------- //

    document.getElementById("login_button").addEventListener("click", function() {
        username = document.getElementById("login_username").value;
        let password = document.getElementById("login_password").value;
        socket.emit("login", username, password);
    });

    document.getElementById("logout_button").addEventListener("click", function() {
        socket.emit("logout", username);
    });

    socket.on("login_successful", function() {
        document.getElementById("login_page").style.visibility = "hidden";
        document.getElementById("home_page").style.visibility = "visible";
        document.getElementById("username_display").textContent = username;
    });

    socket.on("login_failed", function() {
        document.getElementById("login_error_message").value = "Login Failed, check your username and password.";
    });

    socket.on("logout_successful", async function() {
        document.getElementById("home_page").style.visibility = "hidden";
        setTimeout(() => {
            document.getElementById("login_page").style.visibility = "visible";
        }, 1000);         
        username = '';
    });

    // ---------- Register ---------- //

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

});