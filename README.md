### Setup procedure
1. Install nvm
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash
```
2. Get node version 20.5.1
```bash
nvm install 20.5.1
nvm use 20.5.1
```
3. To install the packages
```bash
npm ci
```
4. To run the app in dev mode
```bash
npm run dev
```
5. To migrate the database
```bash
npm run migrate
```

If facing any issues, try deleting the modules and package-lock.json
```bash
rm -rf node_modules package-lock.json
npm install
```

### File Structure

```
.
├──.env
├── package.json
├── package-lock.json
├── prisma
│   ├── migrations
│   │   ├── 20230920161325_open_code_portal
│   │   │   └── migration.sql
│   │   └── migration_lock.toml
│   └── schema.prisma
├── README.md
└── src
    ├── app.js
    ├── config
    │   └── db.js
    ├── controllers
    │   └── userAuth.controller.js
    ├── middlewares
    │   └── userAuth.middleware.js
    ├── models
    │   └── userModel.js
    ├── public
    │   └── public.js
    ├── routes
    │   ├── index.js
    │   └── v1
    │       ├── authRoutes.js
    │       └── v1-main.js
    └── utils
        ├── index.js
        └── responseCodes.js


12 directories, 17 files

```

- under the routes folder, multiple different folders can exist depending on which version is currently deployed, and which are being worked on. each version (say v1) has its own folder, and inside that folder are the routes used for that particular version of the app.

- all these routes are routed in the v1-main.js inside the v1 folder. this v1-main.js file can then directly be used in the src/app.js file (the main App file).

- this is beneficial as changing from one version to another requires minimal effort: just change the version being imported in the src/routes/index.js, and create separate routes in a new version folder v'x', having a file v'x'-main.js for routing all routes in that version.

- below routes are demonstrated assuming that v1 is the currently deployed version.


### Endpoints

## Auth: 
- server running on http://localhost:4000/

1) /api/v1 - redirects the user to the home page of v1.
2) /api/v1/auth/github - redirects the user to the GitHub Auth page.
3) /api/v1/auth/github/callback - invoked when the user grants access to the app.

- this invokation creates a JWT token and stores it in the cookies. this can then be used to authenticate the user across multiple different pages of our site without them having to login through GitHub.

- returning just the user's github data obtained by making a call to the GitHub API for now. this can be handled on another route, where the relevant information is showed depending on the user's actions on the redirected page.



