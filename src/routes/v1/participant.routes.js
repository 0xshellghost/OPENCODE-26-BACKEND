import express from 'express';
import {
    participantIssues,
    getPRdetails,
    getPRPoints,
    getParticipant,
    loggedInParticipantDetails,
    updateParticipantProfile
} from '../../controllers/participant.controller.js';
import userAuth from '../../middlewares/userAuth.middleware.js';

const participantRouter = express.Router();

participantRouter.get('/', userAuth, loggedInParticipantDetails);
participantRouter.put('/update', userAuth, updateParticipantProfile);
participantRouter.patch('/update', userAuth, updateParticipantProfile);
participantRouter.get('/:participantId/:eventName', getParticipant);
participantRouter.get('/:participantId/:eventName/issues', participantIssues); //repo id as query param
participantRouter.get('/:participantId/pr-points', getPRPoints);
participantRouter.get('/:githubId/:eventName/pr', getPRdetails);

export default participantRouter;


