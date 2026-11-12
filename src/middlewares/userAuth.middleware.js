import jwt from 'jsonwebtoken';
import { response_401 } from '../utils/responseCodes.js';

const userAuth = async (req, res, next) => {
    
    //retrieve jwtToken value from client's request header
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return response_401(res, 'A valid Bearer token is required.');
    }
    try {
        const token = authHeader.slice('Bearer '.length).trim();
        if (!token) {
            return response_401(res, 'A valid Bearer token is required.');
        }
        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET
        );
        const id = payload.id;
        const roles = payload.roles;
        req.user = { id, roles };
        //console.log(req.user)

        next();
    } catch (error) {
        const message = error?.name === 'TokenExpiredError'
            ? 'Your session has expired. Please sign in again.'
            : 'Your session is invalid. Please sign in again.';
        return response_401(res, message);
    }
};

export const optionalUserAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return next();
    }
    try {
        const token = authHeader.split(' ')[1];
        if (token) {
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            req.user = { id: payload.id, roles: payload.roles };
        }
    } catch (error) {
        req.user = null;
    }
    next();
};

export default userAuth;
