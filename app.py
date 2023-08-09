import eventlet

from flask import Flask, redirect, render_template, request, url_for
from flask_socketio import SocketIO, join_room, rooms, close_room, emit
from database.db import Database
from authentication.auth_tools import login_pipeline, update_passwords, hash_password

eventlet.monkey_patch()

app = Flask(__name__, static_folder='static')
HOST, PORT = 'localhost', 5000
global db, logged_in
username = 'default'
db = Database('database/straightface.db')
app.debug = True
socketio = SocketIO(app, cors_allowed_origins="*", asynch_mode='eventlet')
app.config['SECRET'] = "secret"

@app.route('/')  # Render index.html when website is first visited
def index():
    return render_template('index.html')


@app.route('/login')
def login_page():
    return render_template('login.html')


@app.route('/home', methods=['POST'])
def login():
    global username;
    username = request.form['username']
    password = request.form['password']
    if login_pipeline(username, password):
        logged_session()
        return render_template('home.html', username=username)
    else:
        print(f"Incorrect username ({username}) or password ({password}).")
        return render_template('index.html', errorMessage="Invalid username or password.")
    

def logged_session():
    global logged_in 
    logged_in = True


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
        return render_template('register.html', errorMessage="Please fill in all required fields.")
    else:      
        salt, key = hash_password(password)
        update_passwords(username, key, salt)
        db.add_new_user(username, key, email, first_name, last_name)
        return redirect(url_for('index'))
    
@app.route('/room')
def videoChat():
    return render_template('room.html')
    
    

@app.route('/logout', methods=['POST'])
def logout():
    return redirect(url_for('index'))



@socketio.on('login')
def login(username, password):

    if login_pipeline(username, password):
        global logged_in
        logged_in = True
        print(f"Login Successful for { username }")
        emit("login_successful")
        emit("increment_funny_queue", db.get_funnyUsers_length()) # Only used for testing purposes
        emit("increment_serious_queue", db.get_seriousUsers_length()) 
    else:
        print(f"Incorrect username ({username}) or password ({password}).")
        emit("login_failed")


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
    emit("increment_funny_queue", db.get_funnyUsers_length()) # Only used for testing purposes
    emit("increment_serious_queue", db.get_seriousUsers_length()) 
    
@socketio.on("user_join_serious") # User joins 'serious' team and is inserted into the waiting queue
def handle_user_join_serious(username):
    
    print(f"User {username} has joined the serious side!")
    
    sid = request.sid
    db.add_serious_user(username, sid)
    attempt_pairing()
    emit("increment_funny_queue", db.get_funnyUsers_length()) # Only used for testing purposes
    emit("increment_serious_queue", db.get_seriousUsers_length())
        
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
    
    print(f"Paired {funnyUser[0]} with {seriousUser[0]} in room: {room}")
    emit("users_paired", room=room)
    
@socketio.on("disconnect")
def handle_disconnect():
    
    print(f"Handle_disconnect being called")
    
    db.remove_user_from_queues(username)
    
@socketio.on("offer")
def handle_offer(offer, room):
    # Broadcast the offer to the other user in the room
    print("handle_offer executing")
    emit("offer", offer, room=room)

@socketio.on("answer")
def handle_answer(answer, room):
    # Broadcast the answer to the other user in the room
    print("handle_answer executing")
    emit("answer", answer, room=room)

@socketio.on("ice-candidate")
def handle_ice_candidate(candidate, room):
    # Broadcast the ICE candidate to the other user in the room
    print("handle_ice_candidate executing")
    emit("ice-candidate", candidate, room=room)
       
if __name__ == '__main__':
    socketio.run(app, host='localhost') 