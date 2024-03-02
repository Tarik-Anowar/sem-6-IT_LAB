const net = require('net');

const clients = {};

const users = {
    'guest': { password: 'password1', role: 'guest' },
    'manager': { password: 'password2', role: 'manager' },
};

function authenticateUser(username, password) {
    const user = users[username];

    if (user && user.password === password) {
        return user.role;
    } else {
        return 'guest';
    }
}

const server = net.createServer( (socket) => {
    let role = '';
    let userId = '';

    socket.on('data',  (data) => {
        const request = data.toString().trim().split(' ');
        console.log(`request = ${request}`);

        let num = request.length;

        for (let i = 0; i < num; i++) {
            if (request[i] === 'login') {
                userId = request[i+1];
                role = authenticateUser(request[i + 2], request[i + 3]);
                console.log("Client role: " + role);
                socket.write(`You are now logged in as ${role} with userid: ${userId}\n`);
                i += 2;
            }  else if (request[i] === 'put') {
                const key = request[i + 1];
                const value = request[i + 2];
                clients[key] = value;
                console.log(`Stored key-value pair: ${key}=${value}\n`);
                socket.write(`Stored key-value pair: ${key}=${value}\n`);
                i += 2;
            }
            else if (role === 'guest') {
                socket.write('Permission denied. Please log in.\n');
            }
             else if (request[i] === 'get') {
                const key = request[i + 1];
                const value = clients[key];
                console.log(`sent key-value pair:${key}-${value ? value : '<blank>'}\n`);
                socket.write(`key-value pair:${key}-${value ? value : '<blank>'}\n`);
                i += 1;
            } else if (request[i] === 'upgrade' && request[i + 1] === 'manager') {
                userId = request[i+1];
                role = authenticateUser(request[i + 2], request[i + 3]);
                console.log("Client role: " + role);
                socket.write(`User with userID ${userId} upgraded to manager.\n`);
                i += 2;
            } else {
                socket.write('Invalid command.\n');
            }
        }
    });

    socket.on('end', () => {
        console.log(`Connection with ${socket.remoteAddress} closed.`);
    });
});

server.on('error', (err) => {
    console.error(`Server error: ${err.message}`);
});

const PORT = 5555;

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
