# Health-Sync

This application is the web server component for the Apple Health syncing dashboard.

The Xcode project that gets built to iOS devices can be found [here]().

## Setup
- docker-compose up --build
- inside container
    - npx prisma generate
    - npx prisma migrate dev --name init

to use port outside of docker, make sure nothing else is using the port for postgres
