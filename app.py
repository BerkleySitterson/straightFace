import eventlet

from flask import Flask, render_template, request, redirect
from flask_socketio import SocketIO, join_room, leave_room

eventlet.monkey_patch()

app = Flask(__name__, static_folder='static')
app.debug = True;
socketio = SocketIO(app, cors_allowed_origins="*", asynch_mode='eventlet')
app.config['SECRET'] = "secret"

users = {}  # Dictionary to store the role of each connected user
waiting_queue = []  # Queue to store users that are waiting to be paired

@app.route('/')  # Render index.html when website is visited
def index():
    return render_template('index.html')

@app.route('/chatRoom.html')  # Rendering videoChat.html
def chatRoom():
    return render_template('/chatRoom.html')

def pair_users():
    
    print("pair_users being executed")
    
    if len(waiting_queue) >= 2:
        funny_users = [user for user in waiting_queue if user['role'] == 'funny']
        serious_users = [user for user in waiting_queue if user['role'] == 'serious']

        if funny_users and serious_users:
            user1 = funny_users.pop(0)
            user2 = serious_users.pop(0)

            room = f"{user1['sid']}_{user2['sid']}"

            users[user1['sid']] = {'room': room}
            users[user2['sid']] = {'room': room}

            socketio.emit('pairing-message', 'You are paired!')
            socketio.emit('pairing-message', 'You are paired!')

            # Clean up the waiting_queue
            waiting_queue[:] = [
                user for user in waiting_queue if user['sid'] != user1['sid'] and user['sid'] != user2['sid']
            ]
            
            print("Users have now been paired")

@socketio.on('select_role')
def handle_role_selection(data):
    
    print("handle_role_selection being executed")
    
    role = data['role']
    sid = request.sid

    user = {'sid': sid, 'role':role}
    waiting_queue.append(user)
    
    print('User now in waiting queue')

    
@socketio.on('join_matchmaking')
def handle_join_matchmaking():
    
    print('handle_join_matchmaking being executed')
    
    sid = request.sid

    # Add the user to the waiting queue if not already in it
    if sid not in [user['sid'] for user in waiting_queue]:
        # Check if the user is present in the users dictionary
        if sid in users:
            # Store the user in the waiting_queue dictionary
            user = {'sid': sid, 'role': users[sid]['role']}
            waiting_queue.append(user)

    # Pair users if possible
    pair_users()
    
    if sid in users:
        room = users[sid]['room']
        join_room(room)
        print('User has joined room:', room)
        socketio.emit('join_room_complete')
    

@socketio.on('disconnect')
def handle_disconnect():
    
    print("handle_disconnect being executed")
    
    sid = request.sid

    # Remove the user from the waiting queue
    waiting_queue[:] = [user for user in waiting_queue if user['sid'] != sid]

    # Remove the user from their room if they are paired
    if sid in users:
        if users[sid]['room']:
            room = users[sid]['room']
            leave_room(sid, room)
            socketio.emit('pairing-message', 'Your partner has left the room.', room=room)

        # Clean up the room information from the dictionary
        if 'room' in users[sid]:
            del users[sid]['room']

        # Remove the user from the users dictionary
        del users[sid]

if __name__ == '__main__':
    socketio.run(app, host='localhost', port=5000)


    

    



    