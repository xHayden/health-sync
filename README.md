# Health-Sync

This application is the web server component for the Apple Health syncing dashboard.

The Xcode project that gets built to iOS devices can be found [here](https://github.com/xHayden/health-sync-ios).

I stopped working on this project in favor of a more developed data pipelining solution. There are many residual UI bugs with layout sharing and widget settings. Honestly, I didn't intend for this codebase to see the light of day as after I stopped working on it, I let Claude run havoc on it to implement features for my pullup tracker that depends on it. A few people have asked about it, though, so here it is in all of its glory.

iOS App:

<img width="400" alt="image" src="https://github.com/user-attachments/assets/0a4a7e0b-bfce-403c-a69a-426bcec41a20" />

Imported Apple Health Data Demo:

![400](https://img.hayden.gg/CbwIxK0sLt.png)

Pullup Tracker Demo:

![400](https://img.hayden.gg/9C6ZMhQHlk.png)


## Setup
- docker-compose up --build
- inside container
    - npx prisma generate
    - npx prisma migrate dev --name init

to use port outside of docker, make sure nothing else is using the port for postgres
