import bcrypt from 'bcrypt';
import generateToken from '../config/generateToken.js';
import asyncHandler from 'express-async-handler';
import DataBase from '../config/db.js';

export const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, pic } = req.body;

    console.log(`parameters  = ${name} ${email} ${password} ${pic}`);

    if (!name || !email || !password) {
        console.log("returning from hare0");
        return res.status(400).send("Please enter all the fields.");
    }

    try {
        const userExists = await DataBase.query("SELECT COUNT(*) FROM users WHERE email = $1", [email]);

        if (userExists>0) {
            return res.status(400).send("User already exists.");
        }

        const salt = await bcrypt.genSalt(10);
        const encPassWord = await bcrypt.hash(password,salt);

        const newUser = await DataBase.query("INSERT INTO users (user_name, email, password, pic) VALUES ($1, $2, $3, $4) RETURNING *", [name, email, encPassWord, pic]);

        const formattedResponse = {
            "_id": newUser.rows[0].id,
            "name": newUser.rows[0].user_name,
            "email": newUser.rows[0].email,
            "pic": newUser.rows[0].pic,
            "token": generateToken(newUser.rows[0].id), 
        };
        return res.status(201).json(formattedResponse);
    } catch (error) {
        console.error("Error registering user:", error);
        return res.status(500).send("Internal Server Error");
    }
});

export const authUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).send("Enter all the fields.");
        return;
    }

    const user = await DataBase.query("SELECT * FROM users WHERE email = $1", [email]);
    if (user.rows.length === 0 || !(await bcrypt.compare(password, user.rows[0].password))) {
        res.status(401).send("Invalid email or password.");
        return;
    }

    res.status(200).json({
        _id: user.rows[0].id,
        name: user.rows[0].user_name,
        email: user.rows[0].email,
        pic: user.rows[0].pic,
        token: generateToken(user.rows[0].id),
    });
});

export const allUsers = asyncHandler(async (req, res) => {
    try {
        const searchable = req.query.search;
        console.log("search = " + searchable);
        const query = "SELECT * FROM users WHERE lower(user_name) LIKE '%' || $1 || '%' OR lower(email) LIKE '%' || $1 || '%'";
        const result = await DataBase.query(query, [searchable]);
        const users = result.rows;

        if(result.length===0)
        {
            res.status(404);
            console.log("no user Exists")
        }

        const formattedUsers = users.map((user) => ({
            "_id": user.id,
            "name": user.user_name,
            "email": user.email,
            "pic": user.pic,
            "token": generateToken(user.id),
        }));

        res.status(200).json(formattedUsers);
    } catch (err) {
        console.error("Error fetching all users:", err);
        res.status(500).send("Internal Server Error");
    }
});