import { DataType, OPCUAServer, Variant } from "node-opcua"

export type LatheStatus = "enabled"
                        | "disabled"
                        | "failure"

export default class Lathe {
    static readonly PRODUCTION_TIME = 10_000
    static readonly REJECT_CHANCE   = .1

    private _enabled!: boolean
    private _failure:  boolean             = false
    private _produced: number              = 0
    private _rejected: number              = 0
    private _interval: NodeJS.Timer | null = null

    constructor(enabled: boolean = false) {
        this.enabled = enabled
    }

    get status(): LatheStatus {
        if (this.failure)
            return "failure"

        return this.enabled ? "enabled"
                            : "disabled"
    }

    set enabled(enabled: boolean) {
        this._failure = false

        if (enabled === this._enabled)
            return

        if (enabled)
            this._interval = setInterval(() => {
                if (Math.random() <= Lathe.REJECT_CHANCE)
                    this.reject()
                else
                    this.produce()
            }, Lathe.PRODUCTION_TIME)
        else if (this._interval)
            clearInterval(this._interval)

        this._enabled = enabled
    }

    get enabled(): boolean {
        return this._enabled
    }

    set failure(failure: boolean) {
        if (failure)
            this.enabled = false

        this._failure = failure
    }

    get failure(): boolean {
        return this._failure
    }

    get produced(): number {
        return this._produced
    }

    get rejected(): number {
        return this._rejected
    }

    get temperature(): number {
        return this.enabled ? 100 + 20 * (1 - 2 * Math.random()) : 0
    }

    get pressure(): number {
        return this.enabled ? 10 + (1 - 2 * Math.random()) : 0
    }

    get depth(): number {
        return this.enabled ? 10 + 5 * (1 - 2 * Math.random()) : 0
    }

    get speed(): number {
        return this.enabled ? 10 + 5 * (1 - 2 * Math.random()) : 0
    }

    reset() {
        this._produced = 0
        this._rejected = 0
    }

    produce(): number {
        if (this.enabled)
            ++this._produced

        return this._produced
    }

    reject(): number {
        if (this.enabled)
            ++this._rejected
            
        return this._rejected
    }

    register(server: OPCUAServer, minimumSamplingInterval: number = 1_000) {
        const addressSpace = server.engine.addressSpace!
        const namespace    = addressSpace.getOwnNamespace()
        const device       = namespace.addObject({
            organizedBy: addressSpace.rootFolder.objects,
            browseName:  "Lathe",
        })

        namespace.addVariable({
            minimumSamplingInterval,
            componentOf: device,
            browseName:  "Enabled",
            dataType:    DataType.Boolean,
            value:       {
                get: () => {
                    return new Variant({
                        dataType: DataType.Boolean,
                        value:    this.enabled,
                    })
                }
            },
        })

        namespace.addVariable({
            minimumSamplingInterval,
            componentOf: device,
            browseName:  "Temperature",
            dataType:    DataType.Float,
            value:       {
                get: () => {
                    return new Variant({
                        dataType: DataType.Float,
                        value:    this.temperature,
                    })
                }
            },
        })

        namespace.addVariable({
            minimumSamplingInterval,
            componentOf: device,
            browseName:  "Pressure",
            dataType:    DataType.Float,
            value:       {
                get: () => {
                    return new Variant({
                        dataType: DataType.Float,
                        value:    this.pressure,
                    })
                }
            },
        })

        namespace.addVariable({
            minimumSamplingInterval,
            componentOf: device,
            browseName:  "Depth",
            dataType:    DataType.Float,
            value:       {
                get: () => {
                    return new Variant({
                        dataType: DataType.Float,
                        value:    this.depth,
                    })
                }
            },
        })

        namespace.addVariable({
            minimumSamplingInterval,
            componentOf: device,
            browseName:  "Speed",
            dataType:    DataType.Float,
            value:       {
                get: () => {
                    return new Variant({
                        dataType: DataType.Float,
                        value:    this.speed,
                    })
                }
            },
        })

        namespace.addVariable({
            minimumSamplingInterval,
            componentOf: device,
            browseName:  "Produced",
            dataType:    DataType.Int32,
            value:       {
                get: () => {
                    return new Variant({
                        dataType: DataType.Int32,
                        value:    this.produced,
                    })
                }
            },
        })

        namespace.addVariable({
            minimumSamplingInterval,
            componentOf: device,
            browseName:  "Rejected",
            dataType:    DataType.Int32,
            value:       {
                get: () => {
                    return new Variant({
                        dataType: DataType.Int32,
                        value:    this.rejected,
                    })
                }
            },
        })

        namespace.addVariable({
            minimumSamplingInterval,
            componentOf: device,
            browseName:  "Failure",
            dataType:    DataType.Boolean,
            value:       {
                get: () => {
                    return new Variant({
                        dataType: DataType.Boolean,
                        value:    this.failure,
                    })
                }
            },
        })
    }
}