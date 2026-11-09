import express from 'express';
import {
    addRepo,
    deleteRepo,
    renameRepo,
    updateRepoDetails,
    createEvent,
    deleteEvent,
    setFlagshipEvent,
    getAllReposOfEvent,
    incrementPoints,
    getEvents,
    uploadLeaderboard,
    addAdmin,
    getAllMentors,
    addMentorRole,
    removeMentorRole
} from '../../controllers/admin.controller.js';
import {
    addGeekstoreItem,
    updateGeekstoreItem,
    deleteGeekstoreItem,
    getAllGeekstoreItems,
    getGeekstoreItemByIdAdmin,
    getAllGeekstoreOrders,
    getGeekstoreOrderByIdAdmin,
    updateGeekstoreOrderStatus,
    updateGeekstoreOrderPaymentStatus
} from '../../controllers/geekstore.controller.js';
import { participantIssues } from '../../controllers/participant.controller.js';
import {
    getPlatformFeatures,
    updatePlatformFeatures
} from '../../controllers/features.controller.js';
import {
    eventUploader,
    fileUploader
} from '../../middlewares/imageUpload.middleware.js';

const router = express.Router();

// Platform Feature Flags (Tab Visibility)
router.get('/features', getPlatformFeatures);
router.patch('/features', updatePlatformFeatures);
router.put('/features', updatePlatformFeatures);

// Flagship Event Routes
router.put('/events/:eventName/flagship', setFlagshipEvent);
router.put('/event/:eventName/flagship', setFlagshipEvent);

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
router.post(
    '/event/:eventName/leaderboard/upload',
    fileUploader,
    uploadLeaderboard
);

// Geekstore Admin Routes (Platform-wide)
router.get('/geekstore/items', getAllGeekstoreItems);
router.get('/geekstore/items/:itemId', getGeekstoreItemByIdAdmin);
router.post('/geekstore/items', addGeekstoreItem);
router.post('/geekstore/items/add', addGeekstoreItem);
router.patch('/geekstore/items/:itemId', updateGeekstoreItem);
router.patch('/geekstore/items/:itemId/update', updateGeekstoreItem);
router.delete('/geekstore/items/:itemId', deleteGeekstoreItem);
router.delete('/geekstore/items/:itemId/delete', deleteGeekstoreItem);

router.get('/geekstore/orders', getAllGeekstoreOrders);
router.get('/geekstore/orders/:orderId', getGeekstoreOrderByIdAdmin);
router.patch('/geekstore/orders/:orderId/status', updateGeekstoreOrderStatus);
router.patch('/geekstore/orders/:orderId/payment', updateGeekstoreOrderPaymentStatus);

// Backward-compatible event-prefixed aliases
router.post('/event/:eventName/geekstore/add', addGeekstoreItem);
router.patch('/event/:eventName/geekstore/:itemId/update', updateGeekstoreItem);
router.delete(
    '/event/:eventName/geekstore/:itemId/delete',
    deleteGeekstoreItem
);
router.get('/event/:eventName/geekstore', getAllGeekstoreItems);
router.get('/event/:eventName/geekstore/orders', getAllGeekstoreOrders);
router.patch(
    '/event/:eventName/geekstore/orders/:orderId/status',
    updateGeekstoreOrderStatus
);

export default router;
