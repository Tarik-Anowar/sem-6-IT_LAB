import asyncHandler from 'express-async-handler';
import DataBase from '../config/db.js';
import { json } from 'express';

export const accessChat = asyncHandler(async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        console.error("User param not sent with request");
        return res.status(400).send("User param not sent with request");
    }

    try {
        const currentUserQuery = await DataBase.query("SELECT * FROM users WHERE id = $1", [req.user.id]);
        const currentUser = currentUserQuery.rows[0];

        const userQuery = await DataBase.query("SELECT * FROM users WHERE id = $1", [userId]);
        const user = userQuery.rows[0];

        if (!user) {
            console.error("User not found");
            return res.status(404).send("User not found");
        }

        const chatQuery = await DataBase.query(`
            SELECT id, chat_name, created_at, updated_at
            FROM chats
            WHERE is_group = false
            AND id IN (
                SELECT chat_id FROM chatusers WHERE user_id = $1
            )
            AND id IN (
                SELECT chat_id FROM chatusers WHERE user_id = $2
            )
        `, [req.user.id, userId]);

        let chat;
        if (!chatQuery.rows.length) {
            const createdChat = await DataBase.query(`
                INSERT INTO chats (chat_name, is_group)
                VALUES ($1, $2)
                RETURNING *
            `, ["sender", false]);

            const chatId = createdChat.rows[0].id;

            await Promise.all([
                DataBase.query(`INSERT INTO chatusers (chat_id, user_id) VALUES ($1, $2)`, [chatId, userId]),
                DataBase.query(`INSERT INTO chatusers (chat_id, user_id) VALUES ($1, $2)`, [chatId, req.user.id])
            ]);

            chat = createdChat.rows[0];
        } else {
            chat = chatQuery.rows[0];
        }

        const fullChat = {
            chatName: chat.chat_name,
            latestMessage: null,
            isGroup: false,
            groupAdmin: currentUser,
            users: [
                { _id: currentUser.id, name: currentUser.user_name, email: currentUser.email, pic: currentUser.pic },
                { _id: user.id, name: user.user_name, email: user.email, pic: user.pic }
            ],
            createdAt: chat.created_at,
            updatedAt: chat.updated_at
        };

        res.status(200).json(fullChat);
    } catch (error) {
        console.error("Error accessing chat:", error);
        res.status(500).send("Internal Server Error");
    }
});
export const fetchChats = asyncHandler(async (req, res) => {
    const currentUserId = req.user.id;

    try {
        const chatQuery = `
        SELECT DISTINCT c.id AS chat_id, c.chat_name, c.is_group, c.group_admin_id, c.created_at, c.updated_at
        FROM chats c
        JOIN chatusers cu ON c.id = cu.chat_id
        WHERE cu.user_id = $1
        ORDER BY c.updated_at DESC;        
        `;
        const chatResult = await DataBase.query(chatQuery, [currentUserId]);
        const chats = chatResult.rows;

        console.log(chats.length);



        const finalChats = {};

        for (const chat of chats) {
            console.log("chat name == " + chat.chat_name)
            const userList = [];
            const usersQuery = `
                SELECT DISTINCT u.id AS user_id,
                u.user_name,
                u.email,
                u.pic,
                u.created_at,
                u.updated_at
                FROM users u
                JOIN chatusers cu ON u.id = cu.user_id
                WHERE cu.chat_id = $1;
            `;
            const usersResult = await DataBase.query(usersQuery, [chat.chat_id]);
            const users = usersResult.rows;
            
            let groupAdmin = null
            if (chat.group_admin_id !== null) {
                const groupAdminQuery = (await DataBase.query("SELECT * FROM users WHERE id=$1", [chat.group_admin_id])).rows[0];

                groupAdmin = {
                    "_id": groupAdminQuery.id,
                    "name": groupAdminQuery.user_name,
                    "email": groupAdminQuery.email,
                    "pic": groupAdminQuery.pic,
                    "createdAt": groupAdminQuery.created_at,
                    "updatedAt": groupAdminQuery.updated_at
                }
            }




            for (const user of users) {
                const tempUser = {
                    "_id": user.user_id,
                    "name": user.user_name,
                    "email": user.email,
                    "pic": user.pic,
                    "created_at": user.created_at,
                    "updated_at": user.updated_at
                };
                userList.push(tempUser);
            }

            finalChats[chat.chat_id] = {
                "_id": chat.chat_id,
                "chatName": chat.chat_name,
                "isGroup": chat.is_group,
                "users": userList,
                "groupAdmin": groupAdmin,
                "latestMessage": null,
                "createdAt": chat.created_at,
                "updatedAt": chat.updated_at
            };
        }

        const chatList = Object.values(finalChats);

        res.status(200).json(chatList);
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

        const currentUserIdResult = await DataBase.query("SELECT id FROM users WHERE id = $1", [req.user.id]);
        const currentUserId = currentUserIdResult.rows[0].id;

        let users;
        try {
            users = JSON.parse(req.body.users);
            users.push(currentUserId);
        } catch (error) {
            return res.status(400).send({ message: "Invalid users data" });
        }

        if (users.length < 2) {
            return res.status(400).send("More than 2 users are needed");
        }

        const createdChatIdQuery = `
            INSERT INTO chats (chat_name, is_group, group_admin_id)
            VALUES ($1, TRUE, $2)
            RETURNING id
        `;

        const groupChatId = (await DataBase.query(createdChatIdQuery, [req.body.name, req.user.id])).rows[0].id;

        if (!groupChatId) {
            return res.status(500).send("Failed to create group chat");
        }

        const insertUsersQuery = `
            INSERT INTO chatusers (chat_id, user_id)
            VALUES ($1,$2)
        `;
        for (const userId of users) {
            await DataBase.query(insertUsersQuery, [groupChatId, userId]);
        }

        const fullGroupChatQuery = `
            SELECT c.*, u.id as user_id,u.user_name,u.email,u.pic
            FROM chats c
            JOIN chatusers cu ON c.id = cu.chat_id
            JOIN users u ON cu.user_id = u.id
            WHERE c.id = $1
        `;

        const { rows: fullGroupChat } = await DataBase.query(fullGroupChatQuery, [groupChatId]);

        const groupAdminQuery = (await DataBase.query("SELECT * FROM users WHERE id=$1", [fullGroupChat[0].group_admin_id])).rows[0];

        const groupAdmin = {
            "_id": groupAdminQuery.id,
            "name": groupAdminQuery.user_name,
            "email": groupAdminQuery.email,
            "pic": groupAdminQuery.pic,
            "createdAt": groupAdminQuery.created_at,
            "updatedAt": groupAdminQuery.updated_at
        }


        const chatUsers = [];
        for (const row of fullGroupChat) {
            const user = await DataBase.query("SELECT id,user_name,email,pic FROM users WHERE id=$1", [row.user_id]);
            const temp = {
                "_id": user.rows[0].id,
                "name": user.rows[0].user_name,
                "email": user.rows[0].email,
                "pic": user.rows[0].pic,
                "createdAt": user.rows[0].created_at,
                "updatedAt": user.rows[0].updated_at
            };

            chatUsers.push(temp);
        }

        const finalChat = {
            "chatName": fullGroupChat[0].chat_name,
            "latestMessage": null,
            "isGroup": true,
            "groupAdmin": groupAdmin,
            "users": chatUsers,
            "createdAt": fullGroupChat[0].created_at,
            "updatedAt": fullGroupChat[0].updated_at
        };

        res.status(200).json(finalChat);
    } catch (error) {
        console.error("Error creating group chat:", error);
        res.status(500).send("Internal Server Error");
    }
});


export const renameGroup = asyncHandler(async (req, res) => {
    try {
        const { chatId, chatName } = req.body;
        console.log(chatId, chatName);

        if (!chatId || typeof chatId !== 'number' || !chatName || typeof chatName !== 'string') {
            return res.status(400).json({ message: "Invalid chatId or chatName" });
        }

        const updatedChatQuery = `
            UPDATE chats
            SET chat_name = $1
            WHERE id = $2
            RETURNING *
        `;

        const updatedChat = (await DataBase.query(updatedChatQuery, [chatName, chatId])).rows[0];

        if (!updatedChat) {
            return res.status(404).json({ message: "Chat not found" });
        }

        const userList = [];
        const usersQuery = `
            SELECT u.id AS user_id,
                u.user_name,
                u.email,
                u.pic,
                u.created_at,
                u.updated_at
            FROM users u
            JOIN chatusers cu ON u.id = cu.user_id
            WHERE cu.chat_id = $1;
        `;
        const usersResult = await DataBase.query(usersQuery, [chatId]);
        const users = usersResult.rows;

        for (const user of users) {
            const tempUser = {
                "_id": user.user_id,
                "name": user.user_name,
                "email": user.email,
                "pic": user.pic,
                "created_at": user.created_at,
                "updated_at": user.updated_at
            };
            userList.push(tempUser);
        }

        const groupAdminQuery = (await DataBase.query("SELECT * FROM users WHERE id=$1", [updatedChat.group_admin_id])).rows[0];

        const groupAdmin = {
            "_id": groupAdminQuery.id,
            "name": groupAdminQuery.user_name,
            "email": groupAdminQuery.email,
            "pic": groupAdminQuery.pic,
            "createdAt": groupAdminQuery.created_at,
            "updatedAt": groupAdminQuery.updated_at
        }
        const finalChat = {
            "_id": updatedChat.id,
            "chatName": updatedChat.chat_name,
            "isGroup": updatedChat.is_group,
            "users": userList,
            "groupAdmin": groupAdmin,
            "latestMessage": null, // You might want to populate this with actual data
            "createdAt": updatedChat.created_at,
            "updatedAt": updatedChat.updated_at
        };

        res.status(200).json(finalChat);

    } catch (error) {
        console.error("Error renaming group chat:", error);
        res.status(500).send("Internal Server Error");
    }
});


export const addToGroup = asyncHandler(async (req, res) => {
    const { chatId, userId } = req.body;
    if (!userId || !chatId) {
        throw new Error("Not a userId || chatId");
    }

    try {
        const insertQuery = `
            INSERT INTO chatusers (chat_id, user_id)
            VALUES ($1, $2)
            RETURNING *
        `;
        

        const insertedUser = await DataBase.query(insertQuery, [chatId, userId]).rows[0];

        if (!insertedUser) {
            return res.status(500).json({ error: "Failed to add user to group chat" });
        }

        const updatedChatQuery = `
            SELECT c.*, u.*
            FROM chats c
            JOIN chatusers cu ON c.id = cu.chat_id
            JOIN users u ON cu.user_id = u.id
            WHERE c.id = $1
        `;

        const updatedChat = await DataBase.query(updatedChatQuery, [chatId]).rows;

        res.status(200).json(updatedChat);
    } catch (error) {
        console.error("Error adding user to group chat:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export const removeFromGroup = asyncHandler(async (req, res) => {
    const { chatId, userId } = req.body;
    console.log("*******: "+chatId+"  "+userId);
    if (!userId || !chatId) {
        throw new Error("Not a userId || chatId");
    }

    try {

        // const currentUser = (await DataBase.query("select * from users whwre id = $1", [req.user.id])).rows[0];
        const deleteQuery = `
            DELETE FROM chatusers
            WHERE chat_id = $1 AND user_id = $2
            RETURNING *
        `;

        const deletedUser = (await DataBase.query(deleteQuery, [chatId, userId])).rows[0];

        if (!deletedUser) {
            return res.status(404).json({ error: "User not found in group chat" });
        }

        const chat = (await DataBase.query("select * from chats where id = $1",[chatId])).rows[0];


        const userList = [];
        const usersQuery = `
            SELECT u.id AS user_id,
                u.user_name,
                u.email,
                u.pic,
                u.created_at,
                u.updated_at
            FROM users u
            JOIN chatusers cu ON u.id = cu.user_id
            WHERE cu.chat_id = $1;
        `;
        const usersResult = await DataBase.query(usersQuery, [chatId]);
        const users = usersResult.rows;

        for (const user of users) {
            const tempUser = {
                "_id": user.user_id,
                "name": user.user_name,
                "email": user.email,
                "pic": user.pic,
                "created_at": user.created_at,
                "updated_at": user.updated_at
            };
            userList.push(tempUser);
        }

        const groupAdminQuery = (await DataBase.query("SELECT * FROM users WHERE id=$1", [chat.group_admin_id])).rows[0];



        const groupAdmin = {
            "_id": groupAdminQuery.id,
            "name": groupAdminQuery.user_name,
            "email": groupAdminQuery.email,
            "pic": groupAdminQuery.pic,
            "createdAt": groupAdminQuery.created_at,
            "updatedAt": groupAdminQuery.updated_at
        }


        const finalChat = {
            "_id": deletedUser.id,
            "chatName": deletedUser.chat_name,
            "isGroup": deletedUser.is_group,
            "users": userList,
            "groupAdmin": groupAdmin,
            "latestMessage": null,
            "createdAt": deletedUser.created_at,
            "updatedAt": deletedUser.updated_at
        };

        res.status(200).json(finalChat);

    } catch (error) {
        console.error("Error removing user from group chat:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
