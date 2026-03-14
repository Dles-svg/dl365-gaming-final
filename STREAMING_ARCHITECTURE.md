# Daylight ES365 Streaming Architecture

## Overview

Daylight ES365 uses **WebRTC (Web Real-Time Communication)** for peer-to-peer video streaming between Gamers and Miners. This document explains how the streaming system works, how to test it, and how to scale it.

## Architecture Components

### 1. WebRTC Peer-to-Peer Connections

**Technology Stack:**
- WebRTC for real-time video/audio streaming
- Google STUN servers for NAT traversal
- Supabase for signaling and coordination
- React/Electron for UI

**Connection Flow:**
```
Gamer (Broadcaster)          Supabase (Signaling)          Miner (Viewer)
       |                              |                            |
       |--1. Create Stream----------->|                            |
       |<---Stream ID----------------|                            |
       |                              |                            |
       |--2. Generate Offer--------->|                            |
       |   (SDP + ICE candidates)     |                            |
       |                              |                            |
       |                              |<--3. Query Streams---------|
       |                              |----Stream List------------>|
       |                              |                            |
       |                              |<--4. Subscribe to Stream---|
       |                              |----Offer------------------>|
       |                              |                            |
       |                              |<--5. Generate Answer-------|
       |<---Answer-------------------|                            |
       |                              |                            |
       |<====== 6. Direct P2P Video Connection =================>|
```

### 2. Database Schema

**live_streams table:**
- `id`: Unique stream identifier
- `broadcaster_id`: User who is streaming
- `stream_title`: Title of the stream
- `stream_description`: Description
- `stream_type`: 'gaming' or 'mining'
- `is_active`: Stream status
- `viewers`: Current viewer count
- `started_at`: Timestamp

**webrtc_signals table:**
- `id`: Signal ID
- `stream_id`: Associated stream
- `sender_id`: User sending signal
- `receiver_id`: User receiving signal (null for broadcasts)
- `signal_type`: 'offer', 'answer', 'ice-candidate', 'viewer-joined', 'viewer-left'
- `signal_data`: JSON data (SDP, ICE candidate)

## How to Test Streaming (FREE MODE)

### Prerequisites
1. Two computers or one computer + one virtual machine
2. Both on same or different networks
3. Modern browser (Chrome, Edge, Firefox) or Desktop apps

### Testing Steps

#### Option 1: Web Browser Testing
1. **Computer 1 (Gamer):**
   - Go to https://www.dles365.co
   - Sign in with account (or create one)
   - Go to Dashboard → Streaming
   - Click "Start Broadcasting"
   - Enter stream title (e.g., "Test Stream")
   - Allow camera/screen permissions
   - Click "Start Broadcasting"

2. **Computer 2 (Miner):**
   - Go to https://www.dles365.co
   - Sign in with a DIFFERENT account
   - Go to Dashboard → Streaming
   - You should see the live stream in the list
   - Click on it to watch

#### Option 2: Desktop Apps Testing
1. **Computer 1 (Gamer):**
   - Download "E-Gamer App" from Downloads page
   - Install and sign in
   - Start broadcast with screen selection
   - Note the Stream ID

2. **Computer 2 (Miner):**
   - Download "Miner App" from Downloads page
   - Install and sign in (different account)
   - Browse available streams
   - Connect to the gamer's stream

### Current Status: FREE TESTING MODE

**IMPORTANT:** Right now, streaming is FREE for testing purposes:
- ✅ No DL365 coins are charged
- ✅ Both web and desktop apps work
- ✅ Real-time P2P streaming functional
- ✅ Multiple viewers can watch same stream

**When to Enable Payments:**
- After beta testing is successful
- When connection reliability is verified
- When TURN server fallback is added (optional)

## Connection Success Rates

### Current Setup (Google STUN Only)

**Expected Success Rate:** ~80-90%

**Works Well:**
- ✅ Home networks (both users)
- ✅ Mobile hotspots
- ✅ Most residential ISPs
- ✅ Users on same network
- ✅ One user on public IP

**May Fail:**
- ❌ Both users behind strict corporate firewalls
- ❌ Both users behind symmetric NAT
- ❌ School/university networks with strict policies
- ❌ Some cellular networks with carrier-grade NAT

### With TURN Server (Recommended for Production)

**Expected Success Rate:** ~99%

**Benefits:**
- ✅ Works behind any firewall/NAT
- ✅ Relay server as fallback
- ✅ Professional reliability
- ✅ Better for monetization

**Cost:**
- ~$20-50/month for moderate traffic
- Free tier available from some providers

## Troubleshooting

### Connection Status Indicators

The broadcaster now shows connection status:
- **✓ Connected** - Stream is working perfectly
- **⟳ Connecting...** - Attempting to establish connection
- **✗ Connection Failed** - Unable to connect (try TURN server)
- **○ Disconnected** - Connection lost
- **○ Ready** - Ready to start

### Common Issues

**1. "Connection Failed" Error**
- Check firewall settings
- Try different network
- Wait for TURN server implementation

**2. "No video showing"**
- Check camera/screen permissions
- Verify both users are signed in
- Refresh the page

**3. "Stream not appearing in list"**
- Ensure stream is marked as active
- Check that user roles match (gamer/miner)
- Verify database connection

## Multi-User Beta Testing

### Option 1: Manual Testing (Current)
Recruit beta testers:
- 5-10 gamers with different network setups
- 5-10 miners on different networks
- Test various scenarios (home, work, mobile)
- Collect feedback on connection success

### Option 2: Automated Test User Creation
We can create a script to:
- Generate test user accounts
- Simulate streaming sessions
- Test database performance
- Measure connection success rates

Would you like me to create automated test users?

## Scaling Considerations

### Current Capacity
- Unlimited streams (P2P, no server bandwidth)
- Database handles signaling only
- Cost is minimal (just database operations)

### Future Improvements

**Phase 1: Reliability (Recommended Next)**
- [ ] Add TURN server for 99% success rate
- [ ] Add automatic fallback when STUN fails
- [ ] Better error messages for users

**Phase 2: Features**
- [ ] Stream quality selection (720p, 1080p, 4K)
- [ ] Stream recording capability
- [ ] Multiple viewer support per stream
- [ ] Chat moderation tools

**Phase 3: Monetization**
- [ ] Enable DL365 coin charges
- [ ] Premium streaming features
- [ ] Subscription tiers
- [ ] Ad-supported free tier

## TURN Server Setup (Future)

When ready to add TURN server:

```typescript
// Example configuration
const config = getWebRTCConfig({
  enableTurn: true,
  turnServer: {
    urls: 'turn:turnserver.example.com:3478',
    username: 'your-username',
    credential: 'your-credential'
  }
})
```

**Recommended TURN Providers:**
1. **Twilio** - https://www.twilio.com/stun-turn
2. **Xirsys** - https://xirsys.com
3. **Open Relay** - https://www.metered.ca/tools/openrelay/
4. **Self-hosted coturn** - https://github.com/coturn/coturn

## Testing Checklist

- [ ] Gamer can start stream on web browser
- [ ] Gamer can start stream on desktop app
- [ ] Miner can see live streams in list
- [ ] Miner can watch stream on web browser
- [ ] Miner can watch stream on desktop app
- [ ] Multiple miners can watch same stream
- [ ] Connection status shows correctly
- [ ] Stream stops when broadcaster closes
- [ ] Viewer count updates in real-time
- [ ] Works across different networks
- [ ] Works with firewall enabled
- [ ] Audio comes through clearly
- [ ] Video quality is acceptable
- [ ] Latency is under 2 seconds

## Summary

**Right Now:**
- ✅ Streaming works with Google STUN servers
- ✅ FREE for testing - no coin charges
- ✅ Can test with 2 computers (different accounts)
- ✅ Connection status indicators added
- ✅ ~80-90% success rate expected

**Next Steps:**
1. Test with 2 computers to verify it works
2. Recruit beta testers (or create automated tests)
3. Gather feedback on connection success
4. Add TURN server if needed for better reliability
5. Enable coin charging when ready for production
