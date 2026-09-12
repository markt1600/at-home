# The house environment

The environment is an authored 3D approximation based on a 4 minute 5 second phone walkthrough. The reference shows a lift entrance, marble hall, study, storage, orange seating, sage cupboards, raised dining and window-lounge areas, kitchen and utility wing, bedroom, dressing room and bathroom. Distinctive furnishings include the dining pendants, blue study chair, low blue table, telescope, pinball cabinet and orange range.

Room dimensions and some connections are inferred. The supplied height of a seated person is only a rough proportion reference; it does not calibrate the entire video. This is not a photogrammetric scan or an architectural survey. The generated materials and geometry represent the home at night for the game.

The original video, extracted frames, private pictures and personal documents are not included in this repository. All game characters are fictional adults.

`src/house-layout.js` defines room bounds, floor heights and viewing positions. `src/house.js` builds the geometry and collision volumes. Static meshes are combined by material for browser performance. Rooms remain connected through traversable doorways, with stair transitions between levels.

The front door is the main encounter location. A separate mirror event can show a borrowed face briefly in the bedroom mirror, at most four times per play session with a cooldown. Reflections do not reveal a visitor's hidden identity.

To export the geometry and color materials as GLB:

```sh
node scripts/export-house.mjs ../house-model.glb
```

The game adds generated surface maps, atmospheric lighting, rain, physics and interactions at runtime. The GLB export is a reusable static model and includes color materials and compatible lights.
