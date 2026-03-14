# Daylight ES365 Desktop Applications

This project includes two desktop applications built with Electron:

## 1. Gamer Desktop App
**Purpose:** Stream gameplay from your computer to miners on the platform

**Features:**
- Screen/window capture selection
- Live streaming via WebRTC
- Viewer count tracking
- Stream management

**Run in development:**
```bash
npm run electron:dev:gamer
```

**Build installer:**
```bash
npm run electron:build:gamer
```

Output: `dist-electron/gamer/`

## 2. Miner Desktop App
**Purpose:** Watch game streams and provide compute resources

**Features:**
- Browse available streams
- Watch live gameplay
- Real-time chat
- System resource monitoring

**Run in development:**
```bash
npm run electron:dev:miner
```

**Build installer:**
```bash
npm run electron:build:miner
```

Output: `dist-electron/miner/`

## Build Both Apps

```bash
npm run electron:build:all
```

This will create installers for both applications in their respective folders.

## Supported Platforms

- **Windows:** NSIS installer (.exe)
- **macOS:** DMG installer (.dmg)
- **Linux:** AppImage and Debian package (.deb)

## Branding

Both applications feature the Daylight logo and appropriate branding for their respective purposes.

## How It Works

1. **Gamer opens the Gamer App** → Selects screen/game to stream → Starts broadcast
2. **Miner opens the Miner App** → Browses available streams → Watches gameplay
3. **Connection happens via WebRTC** → Peer-to-peer, low latency streaming
4. **Database coordination** → Supabase manages stream metadata and signaling

## Development Notes

- Apps run the same React codebase but with different entry points
- Electron provides native desktop features (screen capture, system info)
- WebRTC handles all streaming without server relay
- Logo displayed in window title bar and app icon
