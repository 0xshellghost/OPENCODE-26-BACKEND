import { response_403, response_500 } from '../utils/responseCodes.js';

export async function isAdmin(req, res, next) {
    try {
        //console.log(req.user);
        if (!req.user.roles.isAdmin) {
            response_403(res, 'Only admin can access');
        }
        next();
    } catch (error) {
        response_500(res, 'Error while verfying admin access', error);
    }
}
