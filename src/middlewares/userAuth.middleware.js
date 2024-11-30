import jwt from 'jsonwebtoken';
import { response_401, response_500 } from '../utils/responseCodes.js';

const userAuth = async (req, res, next) => {
    //retrieve jwtToken value from client's request header
    const authHeader = req.headers['authorization'];
    if (authHeader === null || authHeader === undefined) {
        return response_401(res, 'Unauthorized');
    }
    try {
        const payload = jwt.verify(
            authHeader.split(' ')[1],
            process.env.JWT_SECRET
        );
        const id = payload.id;
        const roles = payload.roles;
        req.user = { id, roles };
        //console.log(req.user)

        next();
    } catch (error) {
        // console.error(error);
        response_500(res, 'Error while verifying token', error);
    }
};

export default userAuth;
