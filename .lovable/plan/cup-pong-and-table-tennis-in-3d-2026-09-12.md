# Cup Pong and Table Tennis in 3D

## What you’ll get
Two additional games—not replacements for the existing four—with computer opponents, private rooms, and online matches. Your uploaded pictures guide the modeling and camera composition; they will not be used as flat game backgrounds or copied GamePigeon branding.

Before either game starts, choose **Quick** or **Full**. In multiplayer, the invitation shows the selected length and the opponent accepts before play begins. Computer difficulty stays at Normal.

## Cup Pong
- A green tabletop, warm wooden surroundings, red cups with white interiors and defined rims, a white ball, believable materials, shadows, and a clear elevated player-view camera.
- Quick: six cups per player. Full: ten cups per player.
- Drag to aim and set power, release to throw; provide keyboard aiming and throwing too.
- Show a restrained aiming guide, then a visible ball arc, table/rim bounces, cup entry, and cup-removal animation.
- Alternate one shot per player. A valid sink removes one opposing cup and earns one point; misses hand over the turn. First to clear the opposing rack wins. No drinking mechanics or complex house rules.
- Normal computer opponent with believable aiming error, rather than guaranteed hits.

## Table Tennis
- A blue table with accurate white markings, a mesh net, red/black paddles with wooden handles, a visible ball, and a warmly lit indoor court inspired by the references.
- Quick: first to seven points. Full: first to eleven. Both require a two-point lead.
- Touch/mouse paddle movement, keyboard alternative, controlled serving, and shot direction influenced by paddle contact and motion.
- Proper table/net collisions, legal serve bounces, net-serve lets, missed returns, double bounces, and out-of-bounds scoring.
- Serve alternates every two points, then every point at deuce. Play a single game rather than a multi-game tournament.
- Normal computer opponent with limited movement speed and reaction time.

## Flow, scores, and animation
- Add both games to the home/game shelves, computer selection, online selection, and private-room invitations with original game artwork.
- Ready/start sequence before inputs and physics begin; clear turn/serve indicators and animated point announcements.
- Keep scores legible above the scene without obscuring the table or cups.
- Soft hit, bounce, cup, score, and victory sounds using the existing mute preference.
- Keep the final result visible with **Play again** and **Choose another game**. Multiplayer rematches require acceptance; preserve the selected length and room connection.
- Handle loading failures, missing 3D support, disconnection, retry, and confirmed quitting without blank screens or silently awarding points.

## Technical approach
- Extend the existing lazy game registry, shared game actions, solo initialization, session initialization, completion checks, and game-selection validation for the two new game keys.
- Use React Three Fiber with client-only loading, reusable scene components, physically based materials, local environment lighting, texture detail, and mobile-conscious geometry/shadow budgets.
- Source license-verified CC0 models where suitable, refine their materials and proportions, and validate assets before use. If suitable cup/table/paddle models cannot be found, explicitly use bespoke detailed geometry—not generic placeholder shapes. Host model and texture assets through the project asset flow.
- Use a proven physics library for collisions and a fixed simulation step. Keep fast scene updates outside React state.
- Cup Pong: validate turn and shot parameters on the server, resolve each shot consistently, and replay the same shot on both clients.
- Table Tennis: use one host simulation with bounded input messages and interpolated snapshots; persist validated point/match events rather than every frame. Ignore duplicate/outdated events and pause on connection loss.
- This is casual multiplayer, not a cheat-proof competitive server simulation; never grant unrestricted client score writes.
- Inspect database game-key constraints and catalog records before extending them; include required permissions and access policies for any new data structures.

## Acceptance checks
- Test both match lengths, legal/illegal actions, scoring, deuce, wins, misses, cup removal, replay, and quitting.
- Browser-check both 3D scenes at desktop and phone sizes: visible models, moving balls, working input, clear scores, no overlapping controls, and no asset errors.
- Verify reduced-motion behavior, muted audio, loading/retry states, and WebGL-unavailable messaging.
- Test two connected players for invitations, synchronized outcomes, disconnection, and rematch acceptance; report any real-device/network checks that remain unverified.
