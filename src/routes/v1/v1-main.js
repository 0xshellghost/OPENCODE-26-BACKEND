import express from 'express';
import userAuthRouter from './userAuth.routes.js';
import participantRouter from './participant.routes.js';
import eventRouter from './events.routes.js';
import registerRouter from './register.routes.js';
import adminRouter from './admin.routes.js';
import { response_200 } from '../../utils/responseCodes.js';
import { routerFunction } from '../../controllers/githubBot.controller.js';
import { isAdmin } from '../../middlewares/isAdmin.middleware.js';
import userAuth from '../../middlewares/userAuth.middleware.js';
import signatureVerification from '../../middlewares/webhookValidate.middleware.js';

const router = express.Router();

//configure all routes to use in v1 here. export it as a single version file.

router.use('/auth', userAuthRouter);
router.use('/participant', participantRouter);
router.use('/events', eventRouter);
router.use('/register', registerRouter);
router.use('/admin', userAuth, isAdmin, adminRouter);

router.post('/github-bot', signatureVerification, routerFunction);
router.get('/', (req, res) => {
    response_200(res, 'V1 is live');
});

export default router;
