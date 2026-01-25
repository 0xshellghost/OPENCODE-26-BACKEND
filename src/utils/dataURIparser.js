import DataUriParser from 'datauri/parser.js';
const getFileType = (file) => {
    return  file.mimetype.split('/').pop();
}

export const getDataURI = async (file) => {
    const parser = new DataUriParser();
    return parser.format(getFileType(file),file.buffer);
}