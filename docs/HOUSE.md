# The house environment

The current model uses the supplied 78-page contract drawing set dated 20 March 2023, together with the walkthrough for current furnishings. The earlier rectangular approximation has been replaced with a polygonal plan: angled lift lobby and entrance, sunken living room, two window bays, dining and kitchen, utility/service rooms, home office, wine cellar, bedroom wing, wardrobe, meditation alcove, bathrooms and window lounge/home theatre.

## Dimensions and levels

The plan is calibrated against the 16,880 mm north dimension. Major room outlines and door locations are traced from the dimensioned doors plan (sheet 8), checked against the proposed layout and wet works plans (sheets 2 and 4). Living-room floor datum is 0 mm; entrance, dining, kitchen and service rooms are +450 mm; the wine cellar and bedroom level are +750 mm. The shared stair definitions generate both visible treads and continuous walking heights. Movement cannot jump across a raised edge. Bathroom drainage falls and small threshold drops are simplified.

The kitchen uses 900 mm counters and 600 mm cabinet depth from sheets 50–56. The office, 1,975 × 1,200 × 975 mm wine island, bedroom divider, sliding mirror and theatre fittings use the relevant room detail sheets. The walkthrough supplies the red artwork, orange and cream seating, blue table/chair, telescope and pinball machine.

This is an authored game reconstruction, not a survey, CAD conversion or photogrammetric scan. Some opening edges are traced from rendered drawings, and furniture, fixtures, ceiling transitions and finishes remain simplified for browser performance. The contract drawings describe a proposed design; visible current furnishings take precedence where the walkthrough differs.

## Implementation

- `src/house-layout.js`: calibrated polygon outlines, floor levels, stair footprints and viewpoints.
- `src/house.js`: walls, glazing, floors, ceilings, fixtures and collision volumes.
- `src/plan-geometry.js`: floor cutouts for stair runs.
- `src/navigation.js`: polygon boundaries and rotated wall collisions.
- `src/visitors.js`: full-length photographic visitors, ground anchoring, chroma key and visible-pixel hit detection.

The front door remains the main encounter. The bedroom mirror can show a complete reflected figure briefly; it does not reveal a hidden identity. Visitor heights range from 1.63 to 1.80 m. Whole figures face the player, with floor contact shadows, rather than a chest portrait floating above the ground.

The original drawings, walkthrough, extracted pages, address, private pictures and personal documents are not included in the repository. Game characters are fictional adults.

Export reusable geometry, color materials and compatible lights:

```sh
node scripts/export-house.mjs ../house-model.glb
```

Surface maps, visitor sprites, rain, lighting effects and gameplay are added by the game at runtime and are not bundled in the static GLB.
