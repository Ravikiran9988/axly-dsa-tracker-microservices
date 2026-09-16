"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateJWT = void 0;
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Basic JWT middleware foundation
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        // Defaulting to a dummy secret for the foundation
        const secret = process.env.JWT_SECRET || 'your_jwt_secret_here';
        jsonwebtoken_1.default.verify(token, secret, (err, user) => {
            if (err) {
                return res.status(403).json({ message: 'Forbidden: Invalid token' });
            }
            // Store user info in request for downstream services if needed
            req.user = user;
            next();
        });
    }
    else {
        res.status(401).json({ message: 'Unauthorized: Missing token' });
    }
};
exports.authenticateJWT = authenticateJWT;
//# sourceMappingURL=jwt.js.map