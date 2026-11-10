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
export const fileUploader = upload.single('file');

export const geekstoreImageUploader = (req, res, next) => {
    upload.any()(req, res, (err) => {
        if (err) {
            return res.status(400).json({ status: "error", error: err.message, message: err.message });
        }
        if (req.files && req.files.length > 0) {
            req.file = req.files[0];
        }
        next();
    });
};
