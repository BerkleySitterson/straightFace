import eventlet
import time

from flask import Flask, render_template, request, session, redirect, url_for
from flask_socketio import SocketIO, join_room, rooms, close_room, emit
from database.db import Database
from authentication.auth_tools import login_pipeline, update_passwords, hash_password, username_exists

eventlet.monkey_patch()

app = Flask(__name__, static_folder='static')
global db
db = Database('database/straightface.db')
app.config['SECRET_KEY'] = 'secret_key'
socketio = SocketIO(app, cors_allowed_origins="*", asynch_mode='eventlet')
HOST, PORT = '0.0.0.0', 5000
app.debug = True

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/home', methods=['POST'])
def login():
    
    username = request.form['username']
    password = request.form['password']
    
    if login_pipeline(username, password):
        session["username"] = username
        print(f"Login Successful for { username }")
        return render_template('home.html', username=username)
    else:
        print(f"Incorrect Username ({username}) or Password ({password}).")
        return render_template('login.html', errMsg="Invalid Username or Password")


@app.route('/register')
def register_page():
    return render_template('register.html')

@app.route('/register', methods=['POST'])
def register():
    
    username = request.form['username']
    password = request.form['password']
    email = request.form['email']
    first_name = request.form['first_name']
    last_name = request.form['last_name']

    if username == "" or password == "" or email == "" or first_name == "" or last_name == "":
        return render_template('register.html', errMsg="Please make sure all fields are complete.")
    else:
        salt, key = hash_password(password)
        update_passwords(username, key, salt)
        db.add_new_user(username, key, email, first_name, last_name)
        if login_pipeline(username, password):
            print(f"Logged in as user: {username}")
            session["username"] = username
            return redirect(url_for('home', username=username))
        else:
            print(f"Unable to log in at this time.")
            return render_template('index.html')
        
@app.route('/videoChat_funny')
def videoChatFunny():
    username = session['username']
    session["role"] = "funny"
    role = session["role"]
    return render_template('videoChat.html', funnyUsername=username, seriousUsername="Waiting for Player...", role=role)

@app.route('/videoChat_serious')
def videoChatSerious():
    username = session["username"]
    session["role"] = "serious"
    role = session["role"]
    return render_template('videoChat.html', seriousUsername=username, funnyUsername="Waiting for Player...", role=role)

@app.route('/logout')
def logout():
    username = session["username"]

    if username_exists(username):
        print(f"Logout Successful for { username }")
        db.remove_user_from_queues(username)
        session.pop('username', None)
        return render_template('index.html')
    
@socketio.on("find_new_player")
def findNewPlayer():
    username = session["username"]
    role = session["role"]
    sid = request.sid
    
    if role == "funny":
        print(f"User {username} has joined the funny side!")
        db.add_funny_user(username, sid)
        attempt_pairing()
    elif role == "serious":
        print(f"User {username} has joined the serious side!")
        db.add_serious_user(username, sid)
        attempt_pairing()

        
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
        
    funnyUsername = funnyUser[0]
    seriousUsername = seriousUser[0]
    
    print(f"Paired {funnyUser[0]} with {seriousUser[0]} in room: {room}")
    emit("set_round_data", {"funnyUsername": funnyUsername, "seriousUsername": seriousUsername, "room": room}, room=room)
    emit("users_paired", {"myID": request.sid, "targetID": targetID})
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
        
@socketio.on("startCountdown")
def handleStartCountdown(room):
    print("Starting Countdown for Room: " + room)
    
    for i in range(3, -1, -1):
        emit("updateCountdown", {"countdown": i}, room=room)
        time.sleep(1)
    
    emit("startRound", room=room)

@socketio.on("startTimerFromServer")
def handleStartTimerFromServer(room):
    print("Starting Timer from Server");
    emit("startTimer", room=room)
    
    
@socketio.on("userSmiled")
def handleUserSmile(room):
    emit("endRoundFunnyWin", room=room)

@socketio.on("disconnect_user")
def handle_user_disconnect(room):
    emit("user_left", room=room)
    
@socketio.on("timerComplete")
def handleTimerComplete(room):
    emit("endRoundSeriousWin", room=room)
    
@socketio.on("disconnect")
def handle_disconnect():
    username = session["username"]   
    print(f"Handle_disconnect being called")
    try:
        db.remove_user_from_queues(username)
    except:
        print(f"User { username } not found in any queues.")
    

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)