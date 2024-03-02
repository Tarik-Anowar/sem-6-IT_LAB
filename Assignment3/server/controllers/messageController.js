import asyncHandler from "express-async-handler";
import Message from "../models/messageModel.js";
import User from "../models/userModel.js";
import Chat from "../models/chatmodel.js";
import { json } from "express";

export const sendMessage = asyncHandler(async (req, res) => {
    const { content, chatId } = req.body;
    if (!content || !chatId) {
        console.log("Invalid data passed into request");
        return res.sendStatus(400);
    }
    const newMessage = {
        sender: req.user._id,
        content: content,
        chat: chatId
    };

    try {
        var message = await Message.create(newMessage);
        message = await message.populate("sender", "name pic");
        message = await message.populate("chat");
        message = await User.populate(message, {
            path: 'chat.users',
            select: "name email pic"
        });
        await Chat.findByIdAndUpdate(chatId, {
            latestMessage: message
        });
        res.status(200).json(message);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});


export const allMessages = asyncHandler(async(req,res)=>{
    try {
        const message = await Message.find({chat:req.params.chatId})
        .populate("sender","name email pic")
        .populate("chat");

        res.status(200).json(message);

    } catch (error) {
        res.status(400).json({error:error.message});
    }
})