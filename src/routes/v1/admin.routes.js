import express from 'express';
import {
    addRepo,
    createEvent,
    deleteEvent,
    getAllReposOfEvent,
    incrementPoints,
    getEvents,
    addAdmin
} from '../../controllers/admin.controller.js';
import { participantIssues } from '../../controllers/participant.controller.js';
import { eventUploader } from '../../middlewares/imageUpload.middleware.js';

const router = express.Router();

// create Event
//use postman
router.post('/create', eventUploader, createEvent);
// delete Event
router.delete('/delete/:eventName', deleteEvent);
// get all created Event
router.get('/events', getEvents);
router.post('/event/:eventName/repos/add', addRepo);
// add repos
router.get('/event/:eventName/repos/delete',deleteRepo) //delete repo
// make another user as admin from admin account
router.post('/:userId/addAdmin', addAdmin);
// get all repos
router.get('/event/:eventName/repos', getAllReposOfEvent);
// Modify points of participants
//bache hue
router.patch('/modify/', incrementPoints);
//view issues of any participant across an event (or a repo within an event)

router.get('/:eventName/:participantId/issues', participantIssues); //repo id as query param
export default router;
