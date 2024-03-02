import jwt from 'jsonwebtoken';
import asyncHandler from "express-async-handler";
import DataBase from '../config/db.js';

const protect = asyncHandler(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return res.status(401).send("Not authorized, no token");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const queryResult = await DataBase.query("SELECT * FROM users WHERE id = $1", [decoded.id]);
        
        if (queryResult.rows.length === 0) {
            console.log("User not found")
            return res.status(404).send("User not found");
        }
        req.user = queryResult.rows[0];
        next();
    } catch (err) {
        console.error('Error verifying token:', err);
        res.status(401).send("Not authorized, token failed");
    }
});

export default protect;
