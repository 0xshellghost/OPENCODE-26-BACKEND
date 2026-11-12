const ALLOWED_GENDERS = new Set(['male', 'female', 'other']);
const ALLOWED_YEARS = new Set([
    'School',
    '1st Year',
    '2nd Year',
    '3rd Year',
    '4th Year',
    'Passout'
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

export function validateRegistration(body = {}) {
    const data = {
        name: clean(body.name),
        email: clean(body.email).toLowerCase(),
        college: clean(body.college),
        graduationYear: Number(body.graduationYear),
        year: clean(body.year),
        branch: clean(body.branch),
        degree: clean(body.degree),
        discordId: clean(body.discordId),
        gender: clean(body.gender).toLowerCase()
    };
    const errors = {};

    if (data.name.length < 2 || data.name.length > 100) {
        errors.name = 'Full name must be between 2 and 100 characters.';
    }
    if (!EMAIL_PATTERN.test(data.email) || data.email.length > 254) {
        errors.email = 'Enter a valid email address (for example, you@example.com).';
    }
    if (data.discordId.length < 2 || data.discordId.length > 100 || /\s/.test(data.discordId)) {
        errors.discordId = 'Enter a valid Discord username without spaces.';
    }
    if (!ALLOWED_GENDERS.has(data.gender)) {
        errors.gender = 'Choose a valid gender option.';
    }
    if (data.college.length < 2 || data.college.length > 200) {
        errors.college = 'College name must be between 2 and 200 characters.';
    }
    if (data.degree.length < 2 || data.degree.length > 50) {
        errors.degree = 'Degree must be between 2 and 50 characters.';
    }
    if (data.branch.length < 2 || data.branch.length > 100) {
        errors.branch = 'Branch must be between 2 and 100 characters.';
    }
    if (!ALLOWED_YEARS.has(data.year)) {
        errors.year = 'Choose a valid current year.';
    }
    if (
        !Number.isInteger(data.graduationYear) ||
        data.graduationYear < 2000 ||
        data.graduationYear > 2100
    ) {
        errors.graduationYear = 'Graduation year must be between 2000 and 2100.';
    }

    return { data, errors, isValid: Object.keys(errors).length === 0 };
}

