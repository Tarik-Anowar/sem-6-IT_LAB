import express from 'express';
import http from 'http';
import {Server} from 'socket.io';
import dotenv from 'dotenv';
import router from './routes/routes.js';
import chatRouter from './routes/chatRoutes.js';
import { notFound,errorHandler } from './middleware/errorMiddleware.js';
const app = express();
dotenv.config();
const server = http.createServer(app);
const io = new Server(server);

app.get("/",(req,res)=>{
    res.send("Hello");
});

app.use(express.json());
app.use('/api/user',router);
app.use('/api/chat',chatRouter);
app.use(notFound);
app.use(errorHandler);

const PORT  = process.env.PORT||9000;
server.listen(PORT,()=>{
    console.log(`server is listenling on http://127.0.0.1:${PORT}`);
})
