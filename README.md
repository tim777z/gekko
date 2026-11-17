# Gekko [![npm](https://img.shields.io/npm/dm/gekko.svg)]() [![Build Status](https://travis-ci.org/askmike/gekko.png)](https://travis-ci.org/askmike/gekko) [![Build status](https://ci.appveyor.com/api/projects/status/github/askmike/gekko?branch=stable&svg=true)](https://ci.appveyor.com/project/askmike/gekko)

![Gordon Gekko](http://mikevanrossum.nl/static/gekko.jpg)

*The most valuable commodity I know of is information.*

-Gordon Gekko

Gekko is a Bitcoin TA trading and backtesting platform that connects to popular Bitcoin exchanges. It is written in JavaScript and runs on [Node.js](http://nodejs.org).

*Use Gekko at your own risk.*

## Architecture

Gekko consists of three main layers:

1. **Core** (`core/`) - Trading logic, indicators (TA-LIB, Tulip), portfolio management, and candle handling. The core uses a callback-based architecture with event emission.

2. **Exchange Wrappers** (`exchange/wrappers/`) - API adapters for each supported exchange (Bittrex, Binance, Kraken, etc.). Each wrapper implements the standard Gekko Trader interface: `getTicker`, `getPortfolio`, `buy`, `sell`, `checkOrder`, `cancelOrder`.

3. **Web UI** (`web/`) - Koa-based web server providing a user interface for configuration, monitoring, and control. The web server connects to the trading core via the emitter module.

### Layer Interaction

```
web/ (Koa server)
   └── emits/events → core/ (trading logic)
   └── reads/writes → exchange/wrappers/ (API clients)
```

The `plugins/` directory contains strategy implementations that consume trading advice from the core layer.

## Installation & Usage

### From a fresh clone

```bash
# 1. Install dependencies (reproducible install)
npm ci

# 2. Configure environment
# Copy .env.example and adjust as needed
cp .env.example .env

# 3. Start Gekko (development mode with UI)
npm start

# 4. Run the test suite
npm test
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm test` | Run Jest test suite with coverage |
| `npm start` | Start Gekko with UI interface |
| `npm run lint` | Run ESLint validation |

### Docker

See `docker-compose.yml` for containerized deployment.

## Documentation

- [Command-line reference](https://gekko.wizb.it/docs/commandline/plugins.html)
- [Supported exchanges](https://gekko.wizb.it/docs/introduction/supported_exchanges.html)
- [Plugin development](https://gekko.wizb.it/docs/commandline/plugins.html)

## Community & Support

Gekko has [a forum](https://forum.gekko.wizb.it/) that is the place for discussions on using Gekko, automated trading and exchanges. In case you rather want to chat in realtime about Gekko feel free to join the [Gekko Support Discord](https://discord.gg/26wMygt).

## Final

If Gekko helped you in any way, you can always leave me a tip at (BTC) 13r1jyivitShUiv9FJvjLH7Nh1ZZptumwW
