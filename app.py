from threading import Thread
from datetime import datetime
from flask_socketio import SocketIO, emit
from flask import Flask, render_template, request, jsonify
import webview
import sys

app = Flask(__name__)
socketio = SocketIO(app)
logs = []

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html', logs=logs)

@app.route('/', methods=['POST'])
def log():
    data = request.json
    log_entry = {
        'time': datetime.now().strftime('%H:%M:%S'),
        'message': data.get('message', ''),
        'type': data.get('type', 'white')
    }
    logs.append(log_entry)
    socketio.emit('new_log', log_entry)
    return jsonify(success=True)

@app.route('/clear', methods=['POST'])
def clear_logs():
    global logs
    logs = []
    socketio.emit('clear_logs')
    return jsonify(success=True)

def start_flask():
    socketio.run(app, host='0.0.0.0', port=8080)

Thread(target=start_flask).start()
webview.create_window('External Roblox Developer Console', 'http://localhost:8080', width=900, height=660, resizable=False)
webview.start()
socketio.stop()
sys.exit()