// server.cpp for Windows
#include <iostream>
#include <cstring>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <thread>
#include <vector>
#include <unordered_map>

#pragma comment(lib, "ws2_32.lib")

char password[6];

std::unordered_map<int, std::unordered_map<std::string, std::string>> myMap;

void handleClient(int clientSocket)
{
    // read commands
    char commands[1024];
    int bytesRead;
    char response[1024];
    response[0] = '\0';

    while ((bytesRead = recv(clientSocket, commands, sizeof(commands), 0)) > 0)
    {
        if (commands[bytesRead - 1] == '$')
        {
            char mutated_passcode[7];
            mutated_passcode[0] = '\0';
            strcat(mutated_passcode, password);
            strcat(mutated_passcode, "$");
            if (strcmp(mutated_passcode, commands) == 0)
            {
                send(clientSocket, "true", 5, 0);
            }
            else
                send(clientSocket, "false", 6, 0);
        }
        else
        {
            // std::cout << commands << "\n";
            char mode = commands[bytesRead - 1];
            std::cout << "Hello " << (mode == 'G' ? "Manager" : "Guest") << "\n";
            
            for (int i = 0; i < bytesRead - 3;)
            {
                // ... (rest of the code remains unchanged)
            }
            break;
        }
    }

    std::cout << "Sending response to client\n";
    send(clientSocket, response, 1024, 0);
    std::cout << strlen(response) << "\n";
    closesocket(clientSocket);
}

int main(int argc, char *argv[])
{
    WSADATA wsaData;
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0)
    {
        std::cerr << "WSAStartup failed." << std::endl;
        return 1;
    }

    if (argc != 2)
    {
        std::cerr << "Usage: " << argv[0] << " <server_ip>" << std::endl;
        WSACleanup();
        return 1;
    }

    // generate a password for each server session
    char charset[] = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-=_+";
    for (int i = 0; i < 5; ++i)
    {
        int index = rand() % sizeof(charset);
        password[i] = charset[index];
    }
    password[5] = '\0';
    std::cout << "Password for the session : " << password << "\n";

    const char *serverIp = argv[1];

    // Create socket
    SOCKET serverSocket = socket(AF_INET, SOCK_STREAM, 0);
    if (serverSocket == INVALID_SOCKET)
    {
        std::cerr << "Error creating socket." << std::endl;
        WSACleanup();
        return 1;
    }

    // Bind socket to any available address and an ephemeral port
    sockaddr_in serverAddress;
    std::memset(&serverAddress, 0, sizeof(serverAddress));
    serverAddress.sin_family = AF_INET;
    serverAddress.sin_addr.s_addr = INADDR_ANY; // Bind to any available address
    serverAddress.sin_port = 0;                 // Let the system choose an ephemeral port

    if (bind(serverSocket, (struct sockaddr *)&serverAddress, sizeof(serverAddress)) == SOCKET_ERROR)
    {
        std::cerr << "Error binding socket." << std::endl;
        closesocket(serverSocket);
        WSACleanup();
        return 1;
    }

    // Retrieve the assigned port
    int addrLen = sizeof(serverAddress);
    if (getsockname(serverSocket, (struct sockaddr *)&serverAddress, &addrLen) == SOCKET_ERROR)
    {
        std::cerr << "Error getting socket name." << std::endl;
        closesocket(serverSocket);
        WSACleanup();
        return 1;
    }

    int serverPort = ntohs(serverAddress.sin_port);

    // Listen for incoming connections
    if (listen(serverSocket, 5) == SOCKET_ERROR)
    {
        std::cerr << "Error listening for connections." << std::endl;
        closesocket(serverSocket);
        WSACleanup();
        return 1;
    }

    std::cout << "Server listening on IP: " << serverIp << ", port: " << serverPort << std::endl;

    while (true)
    {
        // Accept a connection
        sockaddr_in clientAddress;
        int clientAddressSize = sizeof(clientAddress);
        SOCKET clientSocket = accept(serverSocket, (struct sockaddr *)&clientAddress, &clientAddressSize);

        if (clientSocket == INVALID_SOCKET)
        {
            std::cerr << "Error accepting connection." << std::endl;
            continue; // Continue listening for the next connection
        }

        std::cout << "Connection accepted from IP: " << inet_ntoa(clientAddress.sin_addr)
                  << ", port: " << ntohs(clientAddress.sin_port) << std::endl;

        // Create a new thread to handle the client
        std::thread(handleClient, clientSocket).detach();
    }

    // Close the server socket
    closesocket(serverSocket);
    WSACleanup();

    return 0;
}
