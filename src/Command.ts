export interface CommandOptions {
    readonly name:         string
    readonly action:       CommandAction
    readonly minArgCount?: number
    readonly maxArgCount?: number
    readonly description?: string | null
}

export type CommandAction = (...args: string[]) => string | undefined | void

export default class Command {
    readonly name:        string
    readonly action:      CommandAction
    readonly minArgCount: number
    readonly maxArgCount: number
    readonly description: string | null

    constructor(options: CommandOptions) {
        const name        = options.name
        const minArgCount = options.minArgCount ?? 0
        const maxArgCount = options.maxArgCount ?? minArgCount
        const description = options.description ?? null
        const action      = (...args: string[]) => {
            const { action } = options

            if (args.length < this.minArgCount)
                return `Not enough argument. Minimum required: ${this.minArgCount}. Got: ${args.length}`

            if (args.length > this.maxArgCount)
                return `Too many argument. Maximum required: ${this.maxArgCount}. Got: ${args.length}`

            return action.apply(this, args)
        }

        if (minArgCount > maxArgCount)
            throw new Error("minArgCount cannot be greater than maxArgCount")

        this.name        = name
        this.minArgCount = minArgCount
        this.maxArgCount = maxArgCount
        this.description = description
        this.action      = action
    }
}