import amqplib from 'amqplib';
import { Buffer } from 'safe-buffer';
import { 
    AMQP_QUEUE,
    AMQP_HOST,
    JOB_TODO
} from './config';
import { logger } from './logger';
import { delay } from './helpers';
import { doJob as doFetchJob} from './JobFetch/tasks';
// import { doJob as doEmailJob} from './JobEmail/tasks';


/*
 * Main function
 */
(async function () {
    // connect to rabbitmq
    let mqconn = undefined;
    let channel = undefined;
    let connattempts = 0;
    let connected = false;
    let q = AMQP_QUEUE;

    logger.info("Waiting 10 seconds before connecting to queue...");
    await delay(10000);

    while (connected === false) {
        try {
            logger.info("Connecting to rabbitmq...");
            mqconn = await amqplib.connect(AMQP_HOST);
            connected = true;
            logger.info("Connected.");
        } catch (err) {
            logger.error("Error connecting to rabbitmq...");
            logger.error(err);
            connattempts = connattempts + 1;
            if (connattempts >= 3) {
                logger.info("Exiting (1)");
                process.exit(1);
            } else {
                logger.info("Waiting 10 seconds before connecting to queue...");
                await delay(10000);
            }
        }
    }

    try {
        logger.info("Creating channel...");
        channel = await mqconn.createChannel();
        logger.info("Channel created.");
    } catch (err) {
        logger.error("Error creating channel...");
        logger.error(err);
        logger.info("Exiting (1)");
        process.exit(1);
    }

    // Connect to queue
    logger.info("Connecting to queue...");
    channel.assertQueue(q, { durable: true });
    logger.info("Connected to queue.");

    // Prefetch
    channel.prefetch(1);

    // Set main func
    let toDo = undefined;

    switch(JOB_TODO) {
        case "fetch":
            toDo = doFetchJob
    }

    // Ready
    logger.info("Ready to process jobs.");

    // Do job on message
    channel.consume(q, async (msg) => {
        try {
            // worker_fetch_1  | info: Received data:  {"fields":{"consumerTag":"amq.ctag-mrYntwMbcnltIDIpIytFcw","deliveryTag":1,"redelivered":false,"exchange":"","routingKey":"fetch_queue"},"properties":{"headers":{}},"content":{"type":"Buffer","data":[123,34,108,97,110,103,34,58,34,83,80,34,44,34,100,97,116,101,34,58,34,50,48,49,57,45,48,49,45,50,54,34,125]}}
            logger.debug("Received data: ", msg);

            // Create new buffer
            const buf1 = Buffer.from(msg.content);

            logger.debug("Buffered: ", buf1);
            logger.debug("Parsing data...");

            const jobData = JSON.parse(buf1.toString());

            /* *********** */
            /* Do da stuff */
            /* *********** */
            await toDo(jobData);

            channel.ack(msg);

        } catch (error) {
            logger.error(error);
        }

    }, { noAck: false });
})();