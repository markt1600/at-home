# The house environment

The current model uses the supplied 78-page contract drawing set dated 20 March 2023, together with the walkthrough for current furnishings. The earlier rectangular approximation has been replaced with a polygonal plan: angled lift lobby and entrance, sunken living room, two window bays, dining and kitchen, utility/service rooms, home office, wine cellar, bedroom wing, wardrobe, meditation alcove, bathrooms and window lounge/home theatre.

## Dimensions and levels

The plan is calibrated against the 16,880 mm north dimension. Major room outlines and door locations are traced from the dimensioned doors plan (sheet 8), checked against the proposed layout and wet works plans (sheets 2 and 4). Living-room floor datum is 0 mm; entrance, dining, kitchen and service rooms are +450 mm; the wine cellar and bedroom level are +750 mm. Shared stair definitions generate visible treads and walking heights. Movement automatically handles small risers up to 220 mm, while larger edges remain blocked. Bathroom drainage falls are simplified.

The kitchen uses 900 mm counters and 600 mm cabinet depth from sheets 50–56. The office, 1,975 × 1,200 × 975 mm wine island, bedroom divider, sliding mirror and theatre fittings use the relevant room detail sheets. The walkthrough supplies the red artwork, orange and cream seating, blue table/chair, telescope and pinball machine.

This is an authored game reconstruction, not a survey, CAD conversion or photogrammetric scan. Some opening edges are traced from rendered drawings, and furniture, fixtures, ceiling transitions and finishes remain simplified for browser performance. The contract drawings describe a proposed design; visible current furnishings take precedence where the walkthrough differs.

## Implementation

- `src/house-layout.js`: calibrated polygon outlines, floor levels, stair footprints and viewpoints.
- `src/house.js`: walls, glazing, floors, ceilings, fixtures and collision volumes.
- `src/house-architecture.js`: continuous exterior boundary, complete partition runs, and explicit door/window openings with lintels.
- `src/plan-geometry.js`: floor cutouts for stair runs.
- `src/navigation.js`: polygon boundaries and rotated wall collisions.
- `src/actors.js`: friendly photographic characters with matching animation framing and ground anchoring.

Neighbors visit the front door and can be invited inside for tea. Pets remain visible in their care corners. Mirrors and window glass show ordinary reflections. Whole photographic figures face the player and use ground contact shadows.

The original drawings, walkthrough, extracted pages, address, private pictures and personal documents are not included in the repository. Game characters are fictional adults.

Export reusable geometry, color materials and compatible lights:

```sh
node scripts/export-house.mjs ../house-model.glb
```

Surface maps, animated characters, day/night lighting and gameplay are added by the game at runtime and are not bundled in the static GLB.

## Plan and walkthrough review

The second geometry review corrected the lift lobby and lift-door wall, the office's recessed exterior edge, the yard's L-shaped laundry recess, the separate service bathroom/store/bedroom, and the main bedroom's vanity and wardrobe connections. The lobby now has its own ceiling. Exterior walls are generated from the union of room outlines; every intentional door and window is an explicit aperture with a wall above it. A regression check casts 693 rays across exterior walls and upper partitions, with additional checks above each doorway. Navigation checks verify every named room can be reached on foot.

Furnishings follow the walkthrough where it differs from the proposed renderings: a beige massage chair in the meditation alcove, grey sofa and black lounge chair in the window lounge, glass coffee table, blue dining sideboard, laundry fittings, and open bedroom shelving with the cream sofa facing the television. Bicycles are omitted at the owner's request. See [the review notes](FLOOR-PLAN-REVIEW.md) for the comparison and remaining uncertainty. These are simplified meshes, not scans of individual furniture items.

The main bathroom vanity follows C-23 on sheets 67–68: a 1,900 × 600 × 900 mm stone enclosure, a recessed brown trough with twin black taps, and a 1,165 × 1,050 mm mirror in front of the window. The living/dining boundary uses the photographed low display shelf and corner turntable/amplifier rack in place of the previously inferred cream sofa. The entrance switch is mounted directly on the shoe-enclosure return wall.

The kitchen-side hallway includes the tall ink drawing in a carved dark frame, the gold-framed bench and saw-blade print, the smaller white-framed mechanical landscape, and the ochre surround around the narrow window. The artworks are recreated from the supplied photographs as a compact texture atlas; moulded frames are separate meshes. Original photographs remain private.

The main wet bathroom follows the tub, east-wall toilet and SS02 shower partition in sheets 75–76; its basin and mirror remain outside in the separate vanity area. The powder room follows the west-end shower and south-wall toilet/basin layout, with the current photographs supplying the curved yellow vanity, metallic bowl, illuminated mirror and colorful marbled shower lining. Shower doors are held open inward so players can enter.
