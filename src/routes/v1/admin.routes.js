import express from 'express';
import {
    addRepo,
    deleteRepo,
    renameRepo,
    updateRepoDetails,
    createEvent,
    deleteEvent,
    getAllReposOfEvent,
    incrementPoints,
    getEvents,
    uploadLeaderboard,
    addAdmin,
    getAllMentors,
    addMentorRole,
    removeMentorRole
} from '../../controllers/admin.controller.js';
import { participantIssues } from '../../controllers/participant.controller.js';
import { eventUploader, fileUploader } from '../../middlewares/imageUpload.middleware.js';

const router = express.Router();

// Mentor Management Routes
router.get('/mentors', getAllMentors);
router.post('/:userId/addMentor', addMentorRole);
router.delete('/:userId/removeMentor', removeMentorRole);

// create Event
//use postman
router.post('/create', eventUploader, createEvent);
// delete Event
router.delete('/delete/:eventName', deleteEvent);
// get all created Event
router.get('/events', getEvents);
router.post('/event/:eventName/repos/add', addRepo);
// update repos
router.patch('/event/:eventName/repos/:repoName/update', updateRepoDetails);
// rename repos
router.patch('/event/:eventName/repos/:repoName/rename', renameRepo);
// delete repos
router.delete('/event/:eventName/repos/:repoName/delete', deleteRepo);
// make another user as admin from admin account
router.post('/:userId/addAdmin', addAdmin);
// get all repos
router.get('/event/:eventName/repos', getAllReposOfEvent);
// Modify points of participants
//bache hue
router.patch('/modify/', incrementPoints);
//view issues of any participant across an event (or a repo within an event)

router.get('/:eventName/:participantId/issues', participantIssues); //repo id as query param

// Upload event leaderboard from SQL script
router.post('/event/:eventName/leaderboard/upload', fileUploader, uploadLeaderboard);

export default router;
