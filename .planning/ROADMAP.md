# Pulse — Roadmap

## Overview

**6 phases** | **19 v1 requirements** | Vertical MVP structure

Each phase delivers a working, runnable slice of the app. By end of Phase 1 you can connect two clients and hear each other. Each subsequent phase layers in more capability.

---

### Phase 1: Two Clients Talking
**Goal:** End-to-end voice call between two connected clients — the absolute minimum proof the architecture works.
**Mode:** mvp
**Requirements:** VOICE-01, VOICE-02, VOICE-03, SRV-01, SRV-02, SRV-03
**Success Criteria:**
1. Two Windows desktop clients can connect to the C# server and join the same voice room
2. Audio from Client A is heard in real time by Client B and vice versa
3. Either client can leave the room, disconnecting cleanly without crashing the other
4. Server tracks who is connected and which room they are in
5. Users must authenticate (register/login) before joining a room

---

### Phase 2: Full Room Experience
**Goal:** A complete, usable voice room — mic control, deafen, presence list, speaking indicators, room creation.
**Mode:** mvp
**Requirements:** VOICE-04, VOICE-05, VOICE-06, ROOM-01, ROOM-02, ROOM-03
**Success Criteria:**
1. User can create a named voice room; it appears in the room list for all connected clients
2. Push-to-talk mode works — audio only transmits while the configured key is held
3. User can mute/unmute their mic; other participants stop/start hearing them instantly
4. User can deafen themselves; they stop receiving audio until undeafened
5. Participant list shows all users in the room and updates live as people join/leave
6. A visual speaking indicator fires in real time when a participant is transmitting audio

---

### Phase 3: Priority Speaker
**Goal:** Admin can assign priority speaker; when they talk, everyone else gets ducked.
**Mode:** mvp
**Requirements:** PRIOR-01, PRIOR-02, PRIOR-03, PRIOR-04
**Success Criteria:**
1. Admin can assign the priority speaker role to any participant in a room
2. When the priority speaker transmits, all other participants hear their own incoming audio reduced by a configurable dB amount
3. When priority speaker stops transmitting, all volumes return to normal automatically
4. Every participant sees a visual indicator showing who holds the priority speaker role
5. Priority speaker role can be reassigned or removed by admin mid-session

---

### Phase 4: Whisper Side-Channel
**Goal:** Admin-defined whisper groups create a private parallel audio layer inside a room.
**Mode:** mvp
**Requirements:** WHISP-01, WHISP-02, WHISP-03, WHISP-04
**Success Criteria:**
1. Admin can create a whisper group — a named set of users in the current room
2. Whisper group members receive audio from other group members on a separate audio layer that non-members cannot hear
3. Whisper audio plays simultaneously with main room audio (not a mode switch)
4. All participants can see whether a whisper group is active and whether they belong to it
5. Non-members confirm in testing they hear no whisper audio

---

### Phase 5: Text Channels
**Goal:** Users can send and receive text messages in named channels alongside voice.
**Mode:** mvp
**Requirements:** TEXT-01, TEXT-02, TEXT-03
**Success Criteria:**
1. Users can send text messages in a named channel and all connected clients receive them in real time
2. Text channels are listed in the sidebar and navigable independently of voice rooms
3. Channels are ordered by most recent activity (latest message timestamp)
4. Joining or leaving a voice room does not interrupt text channel visibility or incoming messages

---

### Phase 6: Pulse Activity Feed
**Goal:** The "Pulse" home view surfaces what's happening right now — active voice rooms, hot channels — matching the wireframe concept.
**Mode:** mvp
**Requirements:** TEXT-04
**Success Criteria:**
1. A dedicated home view shows voice rooms ordered by participant count (most active first)
2. Hot text channels (high recent message volume) are surfaced in the feed
3. User can jump into a voice room directly from the feed with one click
4. Feed updates live as room/channel activity changes — no manual refresh needed

---

## Traceability

| REQ-ID | Phase |
|--------|-------|
| VOICE-01 | Phase 1 |
| VOICE-02 | Phase 1 |
| VOICE-03 | Phase 1 |
| VOICE-04 | Phase 2 |
| VOICE-05 | Phase 2 |
| VOICE-06 | Phase 2 |
| PRIOR-01 | Phase 3 |
| PRIOR-02 | Phase 3 |
| PRIOR-03 | Phase 3 |
| PRIOR-04 | Phase 3 |
| WHISP-01 | Phase 4 |
| WHISP-02 | Phase 4 |
| WHISP-03 | Phase 4 |
| WHISP-04 | Phase 4 |
| ROOM-01  | Phase 2 |
| ROOM-02  | Phase 2 |
| ROOM-03  | Phase 2 |
| SRV-01   | Phase 1 |
| SRV-02   | Phase 1 |
| SRV-03   | Phase 1 |
| TEXT-01  | Phase 5 |
| TEXT-02  | Phase 5 |
| TEXT-03  | Phase 5 |
| TEXT-04  | Phase 6 |
