import express from 'express';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import log from './logger.js';
import fs from 'fs';

export default class webServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
    }

    async start(pb) {
        this.app.use((req, res, next) => {
            log('info', `${req.method} ${req.url}`);
            next();
        });

        this.app.use(cookieParser());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(bodyParser.json());

        (await import('./gemini.js')).default(this.app);

        this.app.use(express.static('public'));

        this.app.listen(this.port, () => {
            log('info', `Server started on port ${this.port}`);
        });
    }
}
