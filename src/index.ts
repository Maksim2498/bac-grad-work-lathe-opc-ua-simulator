import winston         from "winston"
import readLine        from "readline"
import Lathe           from "Lathe"
import Command         from "Command"

import { OPCUAServer } from "node-opcua"

const readLineInterface = createReadLineInterface()
const logger            = createLogger()

main().catch(processError)

async function main() {
    const server = new OPCUAServer({
        resourcePath: "/UA/Server",
        port:         4840,
    })

    const lathe = new Lathe(true)

    logger.info("Initializing server...")
    await server.initialize()
    logger.info("Initialized")

    logger.info("Creating objects...")
    lathe.register(server)
    logger.info("Created")

    logger.info("Starting server...")
    await server.start()
    logger.info("Started")

    logger.info(`Listening at ${server.getEndpointUrl()}`)
    logger.info("Press Ctrl-C or type stop to quit")

    setupSigInt()

    const commands = createCommands()
    
    let run = true

    promptLoop:
    while (run) {
        const input       = await prompt()
        const normed      = input.trim()
        const splited     = normed.split(/\s+/)
        const commandName = splited[0]!.toLowerCase()
        const args        = splited.slice(1)

        for (const command of commands)
            if (command.name === commandName) {
                const result = command.action(...args)

                if (result != null)
                    logger.error(result)

                continue promptLoop
            }

        logger.error("Invalid command")
        logger.info("Type help to see command list")
    }

    await shutdown()

    return

    function setupSigInt() {
        let stopping = false

        process.on("SIGINT", async () => {
            if (stopping)
                return

            stopping = true

            console.log()
            await shutdown()
        })
    }

    function createCommands(): Command[] {
        return [
            new Command({
                name:        "produce",
                maxArgCount: 1,
                description: "Produces given number of times or once",
                action:      makeTimesAction(() => lathe.produce()),
            }),

            new Command({
                name:        "reject",
                maxArgCount: 1,
                description: "Rejects given number of times or once",
                action:      makeTimesAction(() => lathe.reject()),
            }),

            new Command({
                name:        "help",
                description: "Prints help",

                action() {
                    for (const command of commands) {
                        const message = command.description != null ? `${command.name}\t${command.description}`
                                                                    : command.name

                        logger.info(message)
                    }
                }
            }),

            new Command({
                name:        "stop",
                description: "Stops the server",

                action() {
                    run = false
                }
            }),

            new Command({
                name: "status",
                description: "Shows current status of lathe",

                action() {
                    logger.info(`State:    ${lathe.status  }`)
                    logger.info(`Produced: ${lathe.produced}`)
                    logger.info(`Rejected: ${lathe.rejected}`)
                }
            }),

            new Command({
                name:        "disable",
                description: "Disables the lathe",

                action() {
                    lathe.enabled = false
                }
            }),

            new Command({
                name:        "enable",
                description: "Enables the lathe",

                action() {
                    lathe.enabled = true
                }
            }),

            new Command({
                name:        "toggle",
                description: "Toggles the lathe",

                action() {
                    lathe.enabled = !lathe.enabled
                }
            }),
            
            new Command({
                name:        "reset",
                description: "Resets produce and reject counte",

                action() {
                    lathe.reset()
                }
            }),

            new Command({
                name:        "fail",
                description: "Sets lathe to failure mode",

                action() {
                    lathe.failure = true
                }
            })
        ]

        function makeTimesAction(action: () => void): (timesString?: string) => string | void {
            return function(timesString?: string) {
                if (timesString == null) {
                    action()
                    return
                }

                const times = Number(timesString)

                if (Number.isNaN(times))
                    return `${timesString} is not a number`
                
                    if (times < 0)
                        return `${times} is negative`
                
                for (let i = 0; i < times; ++i)
                    action()

                return
            }
        }
    }

    function prompt(question: string = "> "): Promise<string> {
        return new Promise(resolve => readLineInterface.question(question, resolve))
    }

    async function shutdown(): Promise<never> {
        logger.info("Shutting server down...")
        await server.shutdown()
        logger.info("Shut down")
        process.exit()
    }
}

function createReadLineInterface(): readLine.Interface {
    const readLineInterface = readLine.createInterface({
        input:  process.stdin,
        output: process.stdout,
    })
    
    readLineInterface.on("SIGINT", () => process.emit("SIGINT"))

    return readLineInterface
}

function createLogger() {
    const { Console } = winston.transports

    const handlers = [new Console()]

    const {
        combine,
        errors,
        colorize,
        timestamp,
        align,
        printf
    } = winston.format

    return winston.createLogger({
        level:             process.env.NODE_ENV === "production" ? "http" : "debug",
        transports:        handlers,
        exceptionHandlers: handlers,
        rejectionHandlers: handlers,
        format:            combine(
            errors(),
            colorize({ all: true }),
            timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            align(),
            printf(entry => `[${entry.timestamp}] ${entry.level}: ${entry.message}`)
        )
    })
}

function processError(error: unknown) {
    logger.error(error)
    process.exit(1)
}