import express from 'express';
import registerUser from '../../controllers/register.controller.js';
import userAuth from '../../middlewares/userAuth.middleware.js';

const registerRouter = express.Router();

registerRouter.post('/', userAuth, registerUser);

export default registerRouter;
