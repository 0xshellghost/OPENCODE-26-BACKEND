import jwt from 'jsonwebtoken';

export async function headerChecker(req) {
    try {
    const authHeader = req.headers['authorization'];
    if (authHeader === null || authHeader === undefined || '') return false;
        const payload = jwt.verify(
            authHeader.split(' ')[1],
            process.env.JWT_SECRET
        );
        return true;
    } catch (error) {
        return false;
    }
}