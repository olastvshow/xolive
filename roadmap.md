# Natural touch sports
- [ ] Enlarge objects and remove Cup Pong target.
- [ ] Add velocity gestures and shared visible cup trajectories.
- [ ] Improve tennis tap/swipe contact controls.
- [ ] Verify gameplay and multiplayer synchronization.
- [ ] Real-device touch/performance verification (requires physical devices).

## Phase 1 physics rebuild
- [x] Fix undefined landing build error.
- [ ] Shared fixed-step engine, coalesced gesture input, impact feedback.
- [ ] Replace tennis timing rules with contact simulation, host streaming and AI.
- [ ] Cup shadow, arc, trail, liquid and staged removal.
- [ ] Performance adaptation and browser/physics verification.
- [ ] Physical Android verification (requires device).

### Touch sports verification
- Cup Pong uses velocity-driven throws, visible flight/trails and staged cup removal; tennis uses fixed-step ball simulation, swipe spin and host-resolved points.
- Tuned serves to bounce on both halves before paddle contact; the normal computer shares collision rules.
- Script checks passed for topspin dip, net/out scoring, swipe velocity and power-dependent throw distance. Simulated rally reached four paddle hits and five bounces.
- Desktop browser checks opened both solo games, exercised gestures and reported no page errors.
- Still unverified: real-phone touch feel, two-device multiplayer, disconnect/reconnect, sustained Android frame rate and complete quick/full replay matches.
