import express from 'express';
import Agenda from 'agenda';
import Agendash from 'agendash';
import winston from 'winston';
import amqplib from 'amqplib';
import { Buffer } from 'safe-buffer';


function delay(n) {
    n = n || 2000;
    return new Promise(done => {
        setTimeout(() => {
            done();
        }, n);
    });
}

const app = express();
const port = process.env.PORT;

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.simple(),
    transports: [
        new winston.transports.Console()
    ]
});

const agenda = new Agenda({
    db: {
        address: 'mongodb://db/agendaDb'
    }
});

app.use('/dash', Agendash(agenda));

app.get('/health', (req, res) => {
    logger.info(`${req.ip} requested health status`);
    res.status(200).send('OK');
});

(async function() {
    // connect to rabbit mq
    let mqconn = undefined;
    let fetchchan = undefined;
    let emailchan = undefined;

    try {
        logger.info("Waiting 10 seconds before connecting to queue...");
        await delay(10000);
        logger.info("Done waiting.");
    } catch (err) {
        logger.error("Timeout error...");
        logger.error(err);
    }

    try {
        logger.info("Connecting to rabbitmq...");
        mqconn = await amqplib.connect('amqp://rabbitmq');
        logger.info("Connected.");
    } catch (err) {
        logger.error("Error connecting to rabbitmq...");
        logger.error(err);
        logger.info("Exiting (1)");
        process.exit(1);
        // log error
        // exit
    }

    try {
        logger.info("Creating fetch channel...");
        fetchchan = await mqconn.createChannel();
        logger.info("Fetch channel created.");
    } catch (err) {
        logger.error("Error creating fetch channel...");
        logger.error(err);
        // log error
        // exit
    }

    try {
        logger.info("Creating email channel...");
        emailchan = await mqconn.createChannel();
        logger.info("Email channel created.");
    } catch (err) {
        logger.error("Error creating email channel...");
        logger.error(err);
        // log error
        // exit
    }

    // Define jobs. For now, two: fetcher and sender
    agenda.define('fetch monthly readings', (job, done) => {
        let q = 'fetch_queue';

        logger.info("Asserting queue...");
        try {
            fetchchan.assertQueue(q, { durable: true });
        } catch(error) {
            logger.error(error);
        }

        // generate all the dates for month
        let msgData = {
            lang: 'SP',
            date: '2019-01-26'
        };

        let msg = JSON.stringify(msgData);

        // dispatch job to rabbitmq for every day of month
        logger.info("Dispatching message...");
        try {
            fetchchan.sendToQueue(q, Buffer.from(msg), { persistent: true });
            msgData.date = '2019-01-27';
            msg = JSON.stringify(msgData);
            fetchchan.sendToQueue(q, Buffer.from(msg), { persistent: true });
        } catch(error) {
            logger.error(error);
        }
    });

    agenda.define('send reading email', (job, done) => {
        let q = 'email_queue';
        emailchan.assertQueue(q, { durable: true });

        // dispatch job to rabbitmq
        // Use JSON.stringify!!!
        emailchan.sendToQueue(q, new Buffer());
    });

    // Start agenda
    await agenda.start();

    // Schedule "fetch monthly readings"
    await agenda.every();
    await agenda.now('fetch monthly readings');
    await agenda.now('fetch monthly readings');

    // Schedule "send reading email"
    // Will likely need to fetch from another source
    // and schedule each one. For now schedule all 
    // for 1 AM daily
    await agenda.every();

    await app.listen(port, () => {
        logger.info(`TICNSP jobber listening on port ${port}`);
    });
})();

