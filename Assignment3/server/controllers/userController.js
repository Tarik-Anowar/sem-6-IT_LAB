import generateToken from '../config/generateToken.js';
import User from '../models/userModel.js'
import asyncHandler from 'express-async-handler';

export const registerUser = asyncHandler(async (req, res) => {

    const { name, email, password, pic } = req.body;
    const userExists = await User.findOne({ email });
    if (!name || !email || !password) {
        res.status(400);
        throw new Error("Plase enter all the fileds.");
    }
    if (userExists) {
        res.status(400);
        throw new Error("User already exists.");
    }
    const user = await User.create({
        name,
        email,
        password,
        pic,
    });
    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            pic: user.pic,
            token: generateToken(user._id),
        })
    }
    else {
        res.status(400);
        throw new Error("Fail to create new user")
    }
}
);

export const authUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400);
        throw new Error("Enter all the filds");
    }
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            pic: user.pic,
            token: generateToken(user._id),
        });
    }
    else {
        res.status(400);
        throw new Error("Invalid Id or password");
    }
});
//api/user?serch=tarik
export const allUsers = asyncHandler(async (req, res) => {
    const keyword = req.query.search ? {
        $or: [
            { name: { $regex: req.query.search, $options: "i" } },
            { email: { $regex: req.query.search, $options: "i" } },
        ],
    } : {};
    
    const users = await User.find({
        ...keyword,
        _id: { $ne: req.user._id } 
    });
    res.send(users);
});

