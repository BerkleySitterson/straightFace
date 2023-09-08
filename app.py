import eventlet

from flask import Flask, render_template, request
from flask_socketio import SocketIO, join_room, rooms, close_room, emit
from database.db import Database
from authentication.auth_tools import login_pipeline, update_passwords, hash_password, username_exists

eventlet.monkey_patch()

app = Flask(__name__, static_folder='static')
HOST, PORT = '0.0.0.0', 5000
global db, logged_in
username = 'default'
db = Database('database/straightface.db')
app.debug = True
socketio = SocketIO(app, cors_allowed_origins="*", asynch_mode='eventlet')
app.config['SECRET'] = "secret"

@app.route('/')  # Render index.html when website is first visited
def index():
    return render_template('index.html')

@socketio.on('login')
def login(username, password):

    if login_pipeline(username, password):
        global logged_in
        logged_in = True
        print(f"Login Successful for { username }")
        emit("login_successful")
        emit("get_funny_queue", db.get_funnyUsers_length()) # Only used for testing purposes
        emit("get_serious_queue", db.get_seriousUsers_length()) 
    else:
        print(f"Incorrect username ({username}) or password ({password}).")
        emit("login_failed")

@socketio.on('logout')
def logout(username):

    if username_exists(username):
        print(f"Logout Successful for { username }")
        db.remove_user_from_queues(username)
        emit("logout_successful")
        emit("get_funny_queue", db.get_funnyUsers_length()) # Only used for testing purposes
        emit("get_serious_queue", db.get_seriousUsers_length())

@socketio.on('register')
def register(username, password, email, first_name, last_name):

    if username == "" or password == "" or email == "" or first_name == "" or last_name == "":
        emit("register_failed")
    else:      
        salt, key = hash_password(password)
        update_passwords(username, key, salt)
        db.add_new_user(username, key, email, first_name, last_name)
        emit("register_successful")


@socketio.on("user_join_funny") # User joins 'funny' team and is inserted into the waiting queue
def handle_user_join_funny(username):
    
    print(f"User {username} has joined the funny side!")
    
    sid = request.sid
    db.add_funny_user(username, sid)
    attempt_pairing()
    emit("get_funny_queue", db.get_funnyUsers_length(), broadcast=True) # Only used for testing purposes

  
@socketio.on("user_join_serious") # User joins 'serious' team and is inserted into the waiting queue
def handle_user_join_serious(username):
    
    print(f"User {username} has joined the serious side!")
    
    sid = request.sid
    db.add_serious_user(username, sid)
    attempt_pairing()
    emit("get_serious_queue", db.get_seriousUsers_length(), broadcast=True) # Only used for testing purposes

        
def attempt_pairing(): # Checking to see if there is atleast 1 funny and 1 serious user
    
    print(f"attempt_pairing executing")

    if db.get_funnyUsers_length() >= 1 and db.get_seriousUsers_length() >= 1:
        funnyUser = db.get_and_remove_first_funnyUser()
        seriousUser = db.get_and_remove_first_seriousUser()
        print(f"{funnyUser} and {seriousUser}")
        pair_users(funnyUser, seriousUser)
        print(f"attempt_pairing completed successfully")
        

def pair_users(funnyUser, seriousUser): # Pairs 1 funny and 1 serious user and puts them in a room
    
    room = f"{funnyUser[1]}_{seriousUser[1]}_room"
    print(f"{funnyUser[1]}_{seriousUser[1]}_room")
    
    join_room(room, funnyUser[1])
    join_room(room, seriousUser[1])
    
    db.remove_user_from_queues(funnyUser[0])
    db.remove_user_from_queues(seriousUser[0])
    
    if funnyUser[1] == request.sid:
        targetID = seriousUser[1]
    else:
        targetID = funnyUser[1]
    
    print(f"Paired {funnyUser[0]} with {seriousUser[0]} in room: {room}")
    emit("redirect_to_video", room=room)
    emit("users_paired", {"myID": request.sid, "targetID": targetID, "room": room})
    print(f"UserID: {request.sid} || PeerID: {targetID}")
    
    
@socketio.on("data") 
def handleSignaling(msg):

    msg_type = msg["type"]
    target = msg["target"]
    
    print(f"Message: {msg}")
    print(f"Message Type: {msg_type}")
    print(f"Target ID: {target}")
    
    if msg_type == "video-offer":
        emit("handleVideoOfferMsg", msg, to=target)
    elif msg_type == "new-ice-candidate":
        emit("handleNewIceCandidateMsg", msg, to=target)
    elif msg_type == "video-answer":
        emit("handleVideoAnswerMsg", msg, to=target)   
    
@socketio.on("userSmiled")
def handleUserSmile(room):
    emit("endRound", room=room)

@socketio.on("disconnect_user")
def handle_user_disconnect(room):
    emit("user_left", room=room)
    
@socketio.on("disconnect")
def handle_disconnect():    
    print(f"Handle_disconnect being called")
    # emit("user_left", to=?(peerID))

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)