# Natural touch controls for Cup Pong and Table Tennis

## Direction
Make both games feel directly connected to your finger: bigger play objects, immediate movement, and visible physical contact. No animated hand or arm. Keep the full-screen experience, existing match lengths, Normal computer opponents, and multiplayer modes.

## Cup Pong
- Remove the yellow landing target entirely; do not replace it with another aiming marker.
- Make cups noticeably larger and the ball approximately twice its current visible diameter, tuning cup openings and spacing together so the ball fits naturally. Reframe the camera so both six- and ten-cup racks stay visible.
- Let the player pick up the ball through a generous touch area, drag, and flick to release. Use the swipe direction and recent finger speed for launch direction and force—not distance alone. Normalize gestures across screen sizes.
- Show the complete throw: release, flight, rim/table contact, and the ball descending inside the cup. Keep the cup visible until entry finishes, then animate its removal and announce the score.
- Misses visibly bounce or fall away. Never snap a missed throw into a cup or hide the ball before the outcome is readable.

## Table Tennis
- Enlarge the paddle and ball and bring the action closer without hiding the far court.
- Tapping moves the paddle promptly to the corresponding reachable position. Dragging follows the finger; swiping produces a stroke with direction and power from finger movement.
- A tap can position the paddle for a gentle block; a faster swipe produces a stronger return. Hits require actual ball/paddle contact rather than an arbitrary release gesture.
- Tap to prepare a serve, then swipe to strike. Show paddle follow-through, ball contact, table bounces, net hits, and missed returns as continuous motion.
- Keep the ball and paddle visible beside the finger, with a forgiving but bounded contact area and no sluggish movement delay.

## Technical approach
The current code uses swipe distance without velocity, removes scored cups immediately, and draws ball motion separately from the landing calculation. Tennis returns currently use a fixed timing window. Replace these paths rather than adding cosmetic animation over them.

- Separate each game's input and simulation while retaining shared presentation where useful.
- Sample timestamped pointer positions, including the release position; derive smoothed release velocity and direction. Handle pointer cancellation, multiple fingers, and resizing safely. Preserve mouse and keyboard alternatives.
- Use shared physical dimensions for visible models and collision geometry. Extend the existing physics engine with fixed steps and swept collision checks for fast balls.
- Render the same trajectory/contact events that determine the outcome. Stage score feedback and final-match results after the decisive contact animation, including the last cup.
- For Cup Pong, validate bounded shot parameters on the server and replay the resolved shot consistently for both players.
- For tennis, use a single host simulation with bounded inputs and interpolated remote motion, validated point events, duplicate-event protection, and a pause on disconnection. This remains casual multiplayer, not a cheat-proof competitive simulation.
- Update computer play to use the same motion/contact rules. Retain existing muted-audio preferences and restrained contact sounds.

## Research reference
[Table Tennis Touch](https://apps.apple.com/us/app/table-tennis-touch/id860620713) explicitly uses intuitive swipe controls for serving, spinning, and smashing. Use that direct-touch interaction principle as inspiration, not copied artwork or a claim to reproduce its proprietary physics. Tune this implementation through measured gesture and gameplay tests.

## Acceptance checks
- Slow versus fast swipes visibly change force; left/right swipes change direction consistently on different screen sizes.
- Cup Pong has no target marker; enlarged objects fit both rack sizes; clean entries, rim misses, table bounces, and final-cup scoring play through visibly.
- Tennis taps reposition the paddle, swipes change stroke strength, and scoring follows real contact/miss outcomes.
- Verify both games in desktop and phone-sized browser views, including movement sequences—not just a still image—with no overlapping controls or blank scenes.
- Test quick/full matches, computer turns, replay, and two connected browser sessions for matching outcomes and disconnection handling.
- Report real-phone touch feel and any two-device/network checks that cannot be verified in the browser; do not claim native-device testing without it.
