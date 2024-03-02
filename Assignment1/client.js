const { get } = require('http');
const net = require('net');

const client = new net.Socket();
let i = 0;
while (process.argv[i]) {
  console.log(`arg[${i++}] : ${process.argv[i]}`);
}

const serverHost = process.argv[2];
const serverPort = process.argv[3];
const userId = process.argv[4];
const username = process.argv[5];
const password = process.argv[6];


let arr = []
let str = '';
process.argv.slice(4).forEach((command) => {
  switch (command) {
    case 'put':
      if (str !== '')
        arr.push(str);
      str = command + ' ';
      break;
    case 'get':
      if (str !== '')
        arr.push(str);
      str = command + ' ';
      break;
    case 'login':
      if (str !== '')
        arr.push(str);
      str = command + ' ';
      break;
    default:
      str += command + ' ';
  }
});

if (str !== '')
  arr.push(str);

arr.forEach((a) => {
  console.log("Data: " + a);
})

console.log();
console.log();
client.connect(serverPort, serverHost, () => {
  console.log(`Connected to server ${serverHost}:${serverPort}`);
  arr.forEach((data) => {
    console.log('request = ' + data);
    client.write(data);
  })
  client.end();
});

client.on('data', (data) => {
  console.log(data.toString());
});


client.on('end', () => {
  console.log('Connection closed by server.');
});


// request format :
// node client.js 127.0.0.1 5555 login mansger password2 put city Kolkata put county India get country get Institute ....
// node client.js 127.0.0.1 5555 login guest password1/none put city Kolkata put county India get country put Institute JU.... 