import User from '../models/userModel.js'
import Chat from '../models/chatmodel.js'
import asyncHandler from 'express-async-handler';

export const accessChat = asyncHandler(async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        console.log("User param not sent with request");
        return res.sendStatus(400);
    }

    try {
        let isChat = await Chat.find({
            isGroupChat: false,
            $and: [
                { users: { $elemMatch: { $eq: req.user._id } } },
                { users: { $elemMatch: { $eq: userId } } },
            ]
        }).populate("users", "-password").populate("latestMessage");

        isChat = await User.populate(isChat, {
            path: 'latestMessage.sender',
            select: "name pic email",
        });

        if (isChat.length > 0) {
            res.send(isChat[0]);
        } else {
            const chatData = {
                chatName: "sender",
                isGroupChat: false,
                users: [req.user._id, userId],
            };

            const createdChat = await Chat.create(chatData);
            const fullChat = await Chat.findOne({ _id: createdChat._id }).populate("users", "-password");
            res.status(200).send(fullChat);
        }
    } catch (error) {
        console.error("Error accessing chat:", error);
        res.status(500).send("Internal Server Error");
    }
});


export const fetchChats = asyncHandler(async (req, res) => {
    try {
        const chats = await Chat.find({ users: { $elemMatch: { $eq: req.user._id } } }).populate("users", "-password")
            .populate("groupAdmin", "-password")
            .populate("latestMessage").sort({ updatedAt: -1 })
            .then(async (results) => {
                results = await User.populate(results, {
                    path: "latestMessage.sender",
                    select: "name pic email",
                });
                res.send(results);
            })

    } catch (error) {
        console.error("Error while fetching chats:", error);
        res.status(500).send("Error while fetching chats");
    }
});


export const createGroupChat = asyncHandler(async (req, res) => {
    try {
        if (!req.body.users || !req.body.name) {
            return res.status(400).send({ message: "Please fill all the fields" });
        }

        let users;
        try {
            users = JSON.parse(req.body.users);
        } catch (error) {
            return res.status(400).send({ message: "Invalid users data" });
        }

        if (users.length < 2) {
            return res.status(400).send("More than 2 users are needed");
        }

        users.push(req.user);

        const groupChat = await Chat.create({
            chatName: req.body.name,
            users: users,
            isGroup: true,
            groupAdmin: req.user,
        });

        const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
            .populate("users", "-password")
            .populate("groupAdmin", "-password");

        res.status(200).json(fullGroupChat);
    } catch (error) {
        console.error("Error creating group chat:", error);
        res.status(500).send("Internal Server Error");
    }
});

export const renameGroup = asyncHandler(async (req, res) => {
    const { chatId, chatName } = req.body;
    console.log(chatId, chatName);

    const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        {
            chatName,
        }, {
        new: true,
    }
    ).populate("users", "-password")
        .populate("groupAdmin", "-password");

    res.status(200).json(updatedChat);
});

export const addToGroup = asyncHandler(async (req, res) => {
    const { chatId,userId } = req.body; 
    if(!userId || !chatId)
    {
        throw new Error("Not a userId|| chatId")
    }
    try {
      const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        {
          $push: { users: userId }, 
        },
        {
          new: true,
        }
      )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");
  
      res.status(200).json(updatedChat);
    } catch (err) {
      res.status(500).json({ error: err.message }); 
    }
  });
  

  
export const removeFromGroup = asyncHandler(async (req, res) => {
    const { chatId,userId } = req.body; 
    if(!userId || !chatId)
    {
        throw new Error("Not a userId|| chatId")
    }
    try {
      const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        {
          $pull: { users: userId }, 
        },
        {
          new: true,
        }
      )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");
  
      res.status(200).json(updatedChat);
    } catch (err) {
      res.status(500).json({ error: err.message }); 
    }
  });
  