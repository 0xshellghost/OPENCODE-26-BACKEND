import crypto from 'node:crypto';
import { response_400, response_401, response_500 } from '../utils/responseCodes.js';

export default async function signatureVerification(req, res, next) {
    try {
        const signature = crypto
            .createHmac('sha256', process.env.WEBHOOK_SECRET)
            .update(JSON.stringify(req.body))
            .digest('hex');
        const expected = Buffer.from(`sha256=${signature}`, 'ascii');
        const actual = Buffer.from(req.headers['x-hub-signature-256'], 'ascii');
        try {
            if (crypto.timingSafeEqual(expected, actual)) next();
            else response_401(res, 'Unauthorized webhook');
        } catch (error) {
            response_400(res,'Input Buffer length must be equal in sha256 signature');
        }
    } catch (error) {
        response_500(res, 'Error in validating webhook signature', error);
    }
}
