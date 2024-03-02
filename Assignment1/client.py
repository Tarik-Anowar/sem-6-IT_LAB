# Incomplete
import socket
import sys

def send_command(host, port, command):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as client_socket:
        client_socket.connect((host, port))
        client_socket.sendall(command.encode('utf-8'))
        response = client_socket.recv(1024).decode('utf-8')
        print(response)

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: ./client.py <host> <port> <command>")
        sys.exit(1)

    host = sys.argv[1]
    port = int(sys.argv[2])
    command = ' '.join(sys.argv[3:])

    send_command(host, port, command)
