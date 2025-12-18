import express from 'express';
import {
    participantIssues,
    getPRdetails,
    getParticipant,
    loggedInParticipantDetails
} from '../../controllers/participant.controller.js';
import userAuth from '../../middlewares/userAuth.middleware.js';

const participantRouter = express.Router();

participantRouter.get('/',userAuth,loggedInParticipantDetails);
participantRouter.get('/:participantId/:eventName', getParticipant);
participantRouter.get(
    '/:participantId/:eventName/issues',
    participantIssues
); //repo id as query param
participantRouter.get('/:githubId/:eventName/pr', getPRdetails);

export default participantRouter;


