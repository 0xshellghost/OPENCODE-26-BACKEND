import express from 'express';
import {
    userTokenTransfer,
    userGitHubRedirect
} from '../../controllers/userAuth.controller.js';
import { response_200 } from '../../utils/responseCodes.js';

const router = express.Router();

//configure all routes to use in v1 here. export it as a single version file.

//frontend makes a redirect to /auth/github url when user clicks on sign in button.
router.get('/github', userGitHubRedirect);
//callback should redirect to landing page.
router.get('/github/callback', userTokenTransfer);

export default router;
