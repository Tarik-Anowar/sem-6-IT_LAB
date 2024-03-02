# Incomplete
import socket
import threading

class KeyValueStoreServer:
    def __init__(self, host, port):
        self.host = host
        self.port = port
        self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.users = {}
        self.data = {}
        self.lock = threading.Lock()

    def start(self):
        self.server_socket.bind((self.host, self.port))
        self.server_socket.listen()

        print(f"Server listening on {self.host}:{self.port}")

        while True:
            client_socket, client_address = self.server_socket.accept()
            client_handler = threading.Thread(target=self.handle_client, args=(client_socket,))
            client_handler.start()

    def handle_client(self, client_socket):
        with client_socket:
            while True:
                data = client_socket.recv(1024).decode('utf-8')
                if not data:
                    break

                args = data.split()
                if args[0] == 'register':
                    self.register_user(client_socket, args)
                elif args[0] == 'put':
                    self.put_data(client_socket, args)
                elif args[0] == 'get':
                    self.get_data(client_socket, args)
                else:
                    client_socket.sendall("Invalid command\n".encode('utf-8'))

    def register_user(self, client_socket, args):
        username = args[1]
        password = args[2]
        role = args[3] if len(args) == 4 else 'guest'

        with self.lock:
            self.users[username] = {'password': password, 'role': role}
            client_socket.sendall(f"User {username} registered with role {role}\n".encode('utf-8'))

    def authenticate_user(self, client_socket, username, password):
        if username in self.users and self.users[username]['password'] == password:
            return True
        else:
            client_socket.sendall("Authentication failed\n".encode('utf-8'))
            return False

    def put_data(self, client_socket, args):
        username = args[1]
        password = args[2]
        key = args[3]
        value = args[4]

        if self.authenticate_user(client_socket, username, password):
            with self.lock:
                if username not in self.data:
                    self.data[username] = {}
                self.data[username][key] = value
                client_socket.sendall(f"Key '{key}' set to '{value}' for user {username}\n".encode('utf-8'))

    def get_data(self, client_socket, args):
        username = args[1]
        password = args[2]
        key = args[3]

        if self.authenticate_user(client_socket, username, password):
            with self.lock:
                if username in self.data and key in self.data[username]:
                    client_socket.sendall(f"{self.data[username][key]}\n".encode('utf-8'))
                else:
                    client_socket.sendall("<blank>\n".encode('utf-8'))

if __name__ == "__main__":
    server = KeyValueStoreServer('localhost', 5555)
    server.start()
