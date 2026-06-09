# Pulse — Requirements

## v1 Requirements

### Voice Communication (VOICE)

- [ ] **VOICE-01**: User can join a named voice room and hear all other connected participants
- [ ] **VOICE-02**: User can speak and be transmitted to all room participants in real time
- [ ] **VOICE-03**: User can leave a voice room, disconnecting their audio
- [ ] **VOICE-04**: User can use push-to-talk mode — audio is only transmitted while a configured key is held
- [ ] **VOICE-05**: User can mute their own microphone (audio no longer transmitted until unmuted)
- [ ] **VOICE-06**: User can deafen themselves (no incoming audio received until undeafened)

### Priority Speaker (PRIOR)

- [ ] **PRIOR-01**: An admin can assign the priority speaker role to a user in a voice room
- [ ] **PRIOR-02**: When a priority speaker transmits audio, all other participants' incoming audio volume is ducked (lowered) by a configurable amount
- [ ] **PRIOR-03**: When the priority speaker stops transmitting, other participants' volumes return to normal
- [ ] **PRIOR-04**: Participants can see who holds the priority speaker role in their current room

### Whisper (WHISP)

- [ ] **WHISP-01**: An admin can define a whisper group — a named set of users within a voice room who share a private audio side-channel
- [ ] **WHISP-02**: Users in a whisper group receive a secondary audio stream from other whisper group members that non-group members cannot hear
- [ ] **WHISP-03**: Whisper audio is transmitted and received simultaneously with the main room audio (not a separate mode)
- [ ] **WHISP-04**: Participants can see if a whisper group is active in their current room and whether they are a member

### Room Presence (ROOM)

- [ ] **ROOM-01**: User can see the list of all participants currently connected to a voice room
- [ ] **ROOM-02**: User can see a real-time visual indicator showing which participant is currently speaking
- [ ] **ROOM-03**: User can create a new named voice room (channel creation)

### Server & Auth (SRV)

- [ ] **SRV-01**: User can register an account with a username and password
- [ ] **SRV-02**: User can log in with their credentials and maintain a session
- [ ] **SRV-03**: Server manages room state — who is connected, who holds priority speaker, which whisper groups exist

---

## v2 Requirements (deferred)

### Text Channels (TEXT)

- [ ] **TEXT-01**: User can send and receive text messages in named text channels
- [ ] **TEXT-02**: Text channels are organized and visible in the sidebar
- [ ] **TEXT-03**: Text channels are ordered by recent activity so the most active surface first
- [ ] **TEXT-04**: A "Pulse" activity feed surfaces cross-channel activity in real time (hot channels, active voice rooms, recent events)

### Future Targets

- Web browser client (connects to same C# server)
- Cross-platform desktop client (Avalonia/MAUI)
- Video support

---

## Out of Scope (v1)

- Video — voice-only first
- Mobile clients — not targeted
- Web client — after Windows desktop is stable
- Cross-platform desktop — after Windows desktop ships
- Screen sharing — future
- File uploads in text channels — future
- Whisper group assignment by users — admin-only in v1

---

## Traceability

| Phase | Requirements Covered |
|-------|---------------------|
| TBD   | (filled by roadmap) |
