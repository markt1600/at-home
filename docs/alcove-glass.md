# Main-bedroom alcove partition

The owner clarified the bedroom-side wall using an in-game screenshot. The
walkthrough at 204–207 seconds shows an uninterrupted square glass-block wall
beside the bed, with the only entrance around its east return by the window.
The supplied plan also locates GD06 on that return.

The former doorway at drawing position (583, 249) is closed by the complete
partition. The door is now at (602, 228.5), within the existing room footprint.
The nearby window, bed, shelving and massage chair retain their positions.

The wall has approximately 200 mm square, rounded glass blocks, fine light joints
and ribbed faces on both sides. An opaque shaded material approximates the thick
glass's diffused light and privacy; it avoids clear alpha blending, sorting
flicker and a costly extra scene-rendering pass. Small generated surface and bump
textures load synchronously, and all blocks join the existing static material batch.

The revised walls feed player and pet collision and the memory editor floor
plan. Regression checks cover the closed former doorway, privacy from both
sides, the remaining entrance, reachability and massage-chair access.
