# Streaming Testing Guide

## Quick Start: Test Streaming Right Now

### What You Need
- 2 computers (or 1 computer + 1 VM/phone)
- 2 different user accounts on www.dles365.co
- Modern browser (Chrome, Edge, Firefox recommended)

### Option 1: Browser Testing (Easiest)

#### Step 1: Setup Gamer (Computer 1)
1. Go to https://www.dles365.co
2. Sign in or create account
3. Click **Dashboard** → **Streaming**
4. Click **"Start Broadcasting"** button
5. Enter a stream title (e.g., "Test Stream 123")
6. Click **"Start Broadcasting"**
7. Allow camera/screen sharing when prompted
8. You should see "LIVE" badge and green "✓ Connected" status

#### Step 2: Setup Miner (Computer 2)
1. Go to https://www.dles365.co
2. Sign in with a **DIFFERENT** account
3. Click **Dashboard** → **Streaming**
4. You should see the gamer's live stream in the list
5. Click on the stream card to watch
6. Video should start playing within 2-5 seconds
7. Look for "✓ Connected" status indicator

### Option 2: Desktop App Testing (More Features)

#### Download Apps
1. Go to https://www.dles365.co/downloads
2. Download **E-Gamer App** (Computer 1)
3. Download **Miner App** (Computer 2)
4. Install both applications

#### Computer 1 (Gamer)
1. Open E-Gamer App
2. Sign in with your account
3. Go to Streaming section
4. Select screen/window to share
5. Enter stream title and description
6. Click "Start Broadcasting"
7. Connection status will show as "✓ Connected"

#### Computer 2 (Miner)
1. Open Miner App
2. Sign in with different account
3. Browse available streams
4. Click on the gamer's stream
5. Watch the stream in real-time

## What You Should See

### On Gamer's Screen
- ✅ Video preview of what you're sharing
- ✅ Red "LIVE" badge
- ✅ Connection status: "✓ Connected" (green)
- ✅ Viewer count updating (should show "1" when miner joins)
- ✅ "BETA TESTING MODE" banner (no charges)

### On Miner's Screen
- ✅ Live video stream from gamer
- ✅ "✓ Connected" status (green)
- ✅ "FREE BETA TEST" indicator
- ✅ Viewer count
- ✅ Stream title and description
- ✅ Chat interface (right side)

## Connection Status Indicators

Both broadcaster and viewer now show real-time connection status:

| Status | Meaning | Color |
|--------|---------|-------|
| ✓ Connected | Streaming working perfectly | Green |
| ⟳ Connecting... | Establishing connection | Blue |
| ✗ Connection Failed | Unable to connect (firewall/NAT issue) | Red |
| ○ Disconnected | Connection lost | Gray |
| ○ Ready/Initializing | Waiting to start | Gray |

## Troubleshooting

### "No streams showing up"
- Make sure gamer clicked "Start Broadcasting"
- Verify both users are signed in
- Check that user roles match (gamer sees gaming streams, miner sees gaming streams)
- Refresh the page

### "Connection Failed" or stuck on "Connecting..."
- Try different network (mobile hotspot, different WiFi)
- Check firewall settings (may need to allow WebRTC)
- This affects ~10-20% of connections (normal with STUN-only setup)
- When TURN server is added, this will be solved

### "No video showing"
- Check camera/screen permissions in browser
- Click on video player to unmute
- Verify gamer granted screen sharing access
- Try refreshing the viewer's page

### "Viewer count not updating"
- Give it 2-3 seconds to sync
- Check database connection
- Refresh both pages

## Testing Different Scenarios

### Test 1: Same Network
- Both computers on same WiFi
- **Expected:** Should work 100% of the time

### Test 2: Different Networks
- Gamer on WiFi, Miner on mobile hotspot
- **Expected:** Should work 90%+ of the time

### Test 3: Corporate/School Network
- One or both on restricted network
- **Expected:** May fail 30-40% (TURN server needed for production)

### Test 4: Multiple Viewers
- Have 2-3 miners watch same stream
- **Expected:** All should connect successfully
- Viewer count should show correct number

## Current Limitations (Beta)

1. **No coin charging** - Streaming is 100% free during beta
2. **No TURN fallback** - ~10-20% connections may fail on strict networks
3. **Quality auto-detected** - No manual quality selection yet
4. **No recording** - Streams are live-only
5. **Browser refresh needed** - If connection drops, refresh page

## What's Working Now

✅ Real-time P2P streaming via WebRTC
✅ Screen/camera capture on gamer side
✅ Live viewer count updates
✅ Connection status indicators
✅ Chat functionality
✅ Both web and desktop apps functional
✅ Multiple viewers per stream
✅ Cross-platform (Windows, Mac, Linux)
✅ Sub-2-second latency
✅ FREE for testing (no DL365 charges)

## Beta Testing Checklist

Test these scenarios and report results:

- [ ] Stream starts successfully on gamer's computer
- [ ] Miner can see stream in list within 3 seconds
- [ ] Video plays on miner's side
- [ ] Audio works clearly
- [ ] Connection status shows green "Connected"
- [ ] Viewer count increments when miner joins
- [ ] Viewer count decrements when miner leaves
- [ ] Chat messages send and receive
- [ ] Stream stops cleanly when gamer ends broadcast
- [ ] Multiple miners can watch same stream
- [ ] Works on different networks (home WiFi)
- [ ] Works on mobile hotspot
- [ ] Works on both browser and desktop apps

## How to Get Help

If you encounter issues:

1. Check connection status indicator color
2. Look at browser console (F12) for errors
3. Try different network
4. Take screenshot of the issue
5. Note what actions were taken before issue occurred

## Next Steps After Testing

Once streaming works reliably:

1. **Add TURN Server** - For 99%+ connection success
2. **Enable Coin Charging** - When ready for production
3. **Add Quality Settings** - Let users choose resolution
4. **Add Recording** - Save streams for later
5. **Improve UI** - Based on user feedback
6. **Scale Testing** - Test with 50+ concurrent streams

## Questions?

- Check `STREAMING_ARCHITECTURE.md` for technical details
- Review connection status indicators for diagnostics
- Try testing with VPN if local network is restricted
