import multer from 'multer';

const upload = multer({
    storage: multer.memoryStorage()
});
export const eventUploader = upload.fields([
    {
        name: 'logoImage',
        maxCount: 1
    },
    {
        name: 'coverImages',
        maxCount: 5
    }
]);