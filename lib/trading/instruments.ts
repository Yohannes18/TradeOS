export type InstrumentType = 'forex' | 'metal' | 'index' | 'crypto'

export type InstrumentConfig = {
    symbol: string
    type: InstrumentType
    pip_size: number
    pip_value_per_lot: number
    contract_size: number
    lot_step: number
    min_lot: number
    max_lot: number
    price_decimals: number
    leverage: number
}

const DEFAULT_FOREX: InstrumentConfig = {
    symbol: 'FX',
    type: 'forex',
    pip_size: 0.0001,
    pip_value_per_lot: 10,
    contract_size: 100000,
    lot_step: 0.01,
    min_lot: 0.01,
    max_lot: 100,
    price_decimals: 5,
    leverage: 30,
}

const INSTRUMENTS: Record<string, InstrumentConfig> = {
    XAUUSD: {
        symbol: 'XAUUSD',
        type: 'metal',
        pip_size: 0.01,
        pip_value_per_lot: 1,
        contract_size: 100,
        lot_step: 0.01,
        min_lot: 0.01,
        max_lot: 100,
        price_decimals: 2,
        leverage: 20,
    },
    EURUSD: {
        symbol: 'EURUSD',
        type: 'forex',
        pip_size: 0.0001,
        pip_value_per_lot: 10,
        contract_size: 100000,
        lot_step: 0.01,
        min_lot: 0.01,
        max_lot: 100,
        price_decimals: 5,
        leverage: 30,
    },
    GBPUSD: {
        symbol: 'GBPUSD',
        type: 'forex',
        pip_size: 0.0001,
        pip_value_per_lot: 10,
        contract_size: 100000,
        lot_step: 0.01,
        min_lot: 0.01,
        max_lot: 100,
        price_decimals: 5,
        leverage: 30,
    },
    USDJPY: {
        symbol: 'USDJPY',
        type: 'forex',
        pip_size: 0.01,
        pip_value_per_lot: 9,
        contract_size: 100000,
        lot_step: 0.01,
        min_lot: 0.01,
        max_lot: 100,
        price_decimals: 3,
        leverage: 30,
    },
    USTEC100: {
        symbol: 'USTEC100',
        type: 'index',
        pip_size: 1,
        pip_value_per_lot: 1,
        contract_size: 1,
        lot_step: 0.1,
        min_lot: 0.1,
        max_lot: 50,
        price_decimals: 1,
        leverage: 20,
    },
    US500: {
        symbol: 'US500',
        type: 'index',
        pip_size: 1,
        pip_value_per_lot: 1,
        contract_size: 1,
        lot_step: 0.1,
        min_lot: 0.1,
        max_lot: 100,
        price_decimals: 1,
        leverage: 20,
    },
    GER40: {
        symbol: 'GER40',
        type: 'index',
        pip_size: 1,
        pip_value_per_lot: 1,
        contract_size: 1,
        lot_step: 0.1,
        min_lot: 0.1,
        max_lot: 50,
        price_decimals: 1,
        leverage: 20,
    },
    BTCUSD: {
        symbol: 'BTCUSD',
        type: 'crypto',
        pip_size: 1,
        pip_value_per_lot: 1,
        contract_size: 1,
        lot_step: 0.01,
        min_lot: 0.01,
        max_lot: 10,
        price_decimals: 2,
        leverage: 5,
    },
}

const ALIASES: Record<string, string> = {
    XAU: 'XAUUSD',
    GOLD: 'XAUUSD',
    NAS100: 'USTEC100',
    US100: 'USTEC100',
    SPX500: 'US500',
    SP500: 'US500',
    DE40: 'GER40',
    DAX40: 'GER40',
    XBTUSD: 'BTCUSD',
}

export const INSTRUMENT_LIST = Object.values(INSTRUMENTS)

export function resolveInstrument(rawSymbol: string): InstrumentConfig {
    const normalized = rawSymbol.replace(/\s+/g, '').replace('/', '').toUpperCase()
    const alias = ALIASES[normalized] || normalized
    return INSTRUMENTS[alias] || { ...DEFAULT_FOREX, symbol: alias || DEFAULT_FOREX.symbol }
}
