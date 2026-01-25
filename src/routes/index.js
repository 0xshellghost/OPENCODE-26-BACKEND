//change version to use from here.
//import the relevant version routes file here, and export it for use in the main index.js file
import express from 'express';
import v1 from './v1/v1-main.js';

const router = express.Router();

router.use('/v1', v1);

export default router;
