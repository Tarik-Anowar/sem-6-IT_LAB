const { Socket } = require('dgram');
const { create } = require('domain');
const { createServer } = require('http');
const net = require('net');

const clients = {};

const users ={
    'guests':{pasword: 'password1', role: 'user'},
    'manager':{pasword: 'password2', role: 'manager'},


}

function authenticateUser(username,password){
    const user = users[username];

    if(user.password === password)
    {
        return user.role;
    }
    else
    {
        return 'guests';
    }
}


const server = createServer((socket)=>{
    let role  = 'guest';

    socket.on('data', (data)=>{
        const request = data.toString().trim().split(' ');

        if(request[0]==='login'){
            role = authenticateUser(request[1],request[2]);
            console.log("request = "+request);
            console.log("Client log: "+role);
            socket.write(`You are now logged is as ${role}\n`);
        }
        else if(role==='guest'){
            socket.write('Permission denied. Plase log in.\n');
        }
        else if(request[0]==='put'){
            const key = request[1];
            const value = request.slice(2).join(' ');
            clients[socket.remoteAddress][key] = value;
            socket.write(`Stored key-value pair : ${key}-${value}\n`);
        }
        else if(request[0]==='get')
        {
            const key = request[1];
            const value = clients[socket.remoteAddress][key];
            socket.write(`${value?value:'<blank>'}\n`);
        }
        else if (request[0] === 'upgrade' && role === 'manager') {
            const userToUpgrade = request[1];
            clients[userToUpgrade] = {};
            socket.write(`Upgraded user ${userToUpgrade} to manager.\n`);
        } else {
            socket.write('Invalid command.\n');
        }

    }).on('end', ()=>{
        console.log(`Connection with ${socket.remoteAddress} closed.`);
    })
}).on('error', (err) => {
    console.error(`Server error: ${err.message}`);
});

const PORT = 5555;

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});