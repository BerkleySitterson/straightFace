import eventlet
import queue
import os

from flask import Flask, render_template, request, session
from flask_socketio import SocketIO, join_room, emit
from database.db import Database
from authentication.auth_tools import login_pipeline, update_passwords, hash_password, username_exists

eventlet.monkey_patch()

app = Flask(__name__, static_folder='static')
global db
db = Database('database/straightface.db')
app.config['SECRET_KEY'] = 'secret_key'
socketio = SocketIO(app, cors_allowed_origins="*", asynch_mode='eventlet')
PORT = int(os.environ.get('PORT', 5000))
HOST = '0.0.0.0'
app.debug = True 

funnyQueue = queue.Queue()
seriousQueue = queue.Queue()

@app.route('/')
def index():
    username = session.get("username")
    
    if (username == None):        
        return render_template('index.html')
    else:
        funnyRecord = db.getFunnyRecord(username)
        seriousRecord = db.getSeriousRecord(username)
        totalMatches = db.getTotalMatches(username)
        return render_template('home.html', username=username, funnyWL=funnyRecord, seriousWL=seriousRecord, totalMatches=totalMatches)

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/home', methods=['POST'])
def login():
    
    username = request.form['username']
    password = request.form['password']
    
    if login_pipeline(username, password):
        session["username"] = username
        funnyRecord = db.getFunnyRecord(username)
        seriousRecord = db.getSeriousRecord(username)
        print(f"Login Successful for { username }")
        return render_template('home.html', username=username, funnyWL=funnyRecord, seriousWL=seriousRecord)
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

    if any(value == "" for value in [username, password, email, first_name, last_name]):
        return render_template('register.html', errMsg="Please make sure all fields are complete.")
    else:
        salt, key = hash_password(password)
        update_passwords(username, key, salt)
        db.add_new_user(username, key, email, first_name, last_name)
        if login_pipeline(username, password):
            print(f"Logged in as user: {username}")
            session["username"] = username
            funnyRecord = db.getFunnyRecord(username)
            seriousRecord = db.getSeriousRecord(username)
            return render_template('home.html', username=username, funnyWL=funnyRecord, seriousWL=seriousRecord)
        else:
            print(f"Unable to log in at this time.")
            return render_template('index.html')
        
@app.route('/account') # Renders the account page with corresponding data
def account_page():
    username = session.get("username")
    email = db.get_email_by_username(username)
    totalMatches = db.getTotalMatches(username)
    funnyWL = db.getFunnyRecord(username)
    seriousWL = db.getSeriousRecord(username)
    
    if (username != None):
        return render_template('account.html', username=username, email=email, totalMatches=totalMatches, funnyWL=funnyWL, seriousWL=seriousWL)
    else:
        return render_template('account.html', username="Please log in or sign up")
       
@app.route('/videoChat_funny') # Sets the role of the user and renders the funny video chat page
def videoChatFunny():
    username = session['username']
    session["role"] = "funny"
    role = session["role"]
    return render_template('video-chat.html', funnyUsername=username, seriousUsername="Waiting for Player...", role=role)

@app.route('/videoChat_serious') # Sets the role of the user and renders the serious video chat page
def videoChatSerious():
    username = session["username"]
    session["role"] = "serious"
    role = session["role"]
    return render_template('video-chat.html', seriousUsername=username, funnyUsername="Waiting for Player...", role=role)

@app.route('/logout')
def logout():
    username = session.get("username")

    if username != None:
        print(f"Logout Successful for { username }")
        session.pop('username', None)
        return render_template('index.html')
    else:
        return render_template('index.html')
    
@socketio.on("find_new_player") # Checks if there is a player in the each queue and pairs the first 2 together
def findNewPlayer():
    username = session["username"]
    role = session["role"]
    sid = request.sid    
    user = {'username': username, 'sid': sid}
    
    if role == "funny":
        funnyQueue.put(user)
    else:
        seriousQueue.put(user)
        
    if funnyQueue.qsize() and seriousQueue.qsize():
        funnyUser = funnyQueue.get()
        seriousUser = seriousQueue.get()
        pair_users(funnyUser, seriousUser)
        

def pair_users(funnyUser, seriousUser): # Pairs 1 funny and 1 serious user and puts them in a room
    
    room = f"{funnyUser['sid']}_{seriousUser['sid']}_room"
    
    join_room(room, funnyUser['sid'])
    join_room(room, seriousUser['sid'])
    
    if funnyUser['sid'] == request.sid:
        targetID = seriousUser['sid']    
    else:
        targetID = funnyUser['sid']
        
    funnyUsername = funnyUser['username']
    seriousUsername = seriousUser['username']
    
    emit("set_round_data", {"funnyUsername": funnyUsername, "seriousUsername": seriousUsername, "room": room}, room=room)
    emit("users_paired", {"myID": request.sid, "targetID": targetID})
    
    
@socketio.on("data") # Handles the data being sent from the client side WebRTC
def handleSignaling(msg):

    msg_type = msg["type"]
    target = msg["target"]
    
    if msg_type == "video-offer":
        emit("handleVideoOfferMsg", msg, to=target)
    elif msg_type == "new-ice-candidate":
        emit("handleNewIceCandidateMsg", msg, to=target)
    elif msg_type == "video-answer":
        emit("handleVideoAnswerMsg", msg, to=target)   
        
@socketio.on("startingRound")
def handleStartRound(room):
    emit("startRound", room=room)  
    
@socketio.on("userSmiled")
def handleUserSmile(room, remoteUsername):
    username = session["username"]
    db.addFunnyWin(remoteUsername)
    db.addSeriousLoss(username)
    emit("endRoundFunnyWin", room=room)
    
@socketio.on("timerComplete")
def handleTimerComplete(room):
    username = session["username"]
    role = session["role"]
    if role == "funny":
        db.addFunnyLoss(username)
    elif role == "serious":
        db.addSeriousWin(username)
    emit("endRoundSeriousWin", room=room)

    
@socketio.on("disconnect_user")
def handle_user_disconnect(room):
    emit("user_left", room=room)
    
@socketio.on("disconnect")
def handle_disconnect():
    username = session["username"]   
    print(f"Handle_disconnect being called")
    try:
        db.remove_user_from_queues(username)
        session.pop('username', None)
    except:
        print(f"User { username } not found in any queues.")
    

if __name__ == '__main__':
    socketio.run(app, host=HOST, port=PORT)