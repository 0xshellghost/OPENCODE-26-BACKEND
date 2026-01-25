import express from 'express';
import {
    getAllEvents,
    getEvent,
    getAllReposOfEvent,
    getRepoOfEvent,
    getLeaderboard
} from '../../controllers/events.controller.js';
import { isAdmin } from '../../middlewares/isAdmin.middleware.js';
import { addRepo } from '../../controllers/admin.controller.js';
import { registerParticipantForEvent } from '../../controllers/participant.controller.js';
import userAuth from '../../middlewares/userAuth.middleware.js';

const eventRouter = express.Router();

//all events
eventRouter.get('/', getAllEvents);

eventRouter.post('/register', userAuth, registerParticipantForEvent);

//get event by id
eventRouter.get('/:eventName', getEvent);

//all repos in an event
eventRouter.get('/:eventName/repos', getAllReposOfEvent);

//add repo to event
eventRouter.post('/:eventName/repos/add',userAuth, isAdmin, addRepo);

//get repo by id
eventRouter.get('/:eventName/repos/:repoName', getRepoOfEvent);

eventRouter.get('/:eventName/leaderboard', getLeaderboard);

export default eventRouter;
