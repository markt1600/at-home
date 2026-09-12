# House review against the plans and walkthrough

The dimensioned layout and door plan determine room boundaries and circulation. The walkthrough and follow-up photographs determine visible current furniture and clarify built details. The original documents, photographs and video remain outside this repository; no address or unit details are included.

| Area | Plan comparison and correction | Walkthrough comparison |
| --- | --- | --- |
| Entrance and lift | Separate angled lift lobby, ceiling, lift wall, diagonal front-door surround, and the office's exterior recess. GD01 retains the specified 1,865 mm frame and 1,150 mm main leaf. An opaque partition and short return close the shoe-cabinet side of the entrance. | Ceiling-height oak shoe cabinetry faces into the home, with a return cabinet, display niche, grille and framed artwork. The intercom sits on the adjoining wall. |
| Kitchen and yard | A single doorway in the east kitchen wall leads into the service passage. The bathroom opens from that passage on its south wall, not directly into the kitchen. The refrigerator backs against the solid kitchen wall immediately beside the service doorway. Yard follows the stepped laundry recess; shaft and exterior ledge are excluded from walking space. Store, bathroom and small service bedroom remain distinct. | Orange range, stone hood, extended L-shaped wood cabinets, pale counters and black-framed glass upper cabinets follow the latest kitchen photo. Stacked laundry, sink and a bed in the small service bedroom remain. Bicycles are omitted at the owner's request. |
| Main bedroom | West bedhead, 4,010 × 380 mm open divider, entry at the southeast, vanity passage to the north, wardrobe accessed through the vanity, and separate bathroom entry. The bedside cabinet mirror faces into the bedroom. | Blue bedding, open dark shelves, cream sofa and a television facing it. The divider must not be a solid bookcase. |
| Meditation alcove | Retains the bay shape and doorway adjoining the bedroom. | The video shows a beige massage chair instead of the round meditation seat proposed in the drawings. |
| Living and dining | Sunken living floor, raised approaches and stairs retain the plan's levels. The two exterior bays are separate outdoor balconies, reached through 4,370 mm and 3,565 mm sliding-door frames. Low parapets and rails replace the previous enclosed windows. | The armless east sofa occupies the seating ledge, with its back meeting the wine-cellar walkway. The mistaken cupboard on the sofa is removed. Dining chairs face the table. Balcony planting and a covered barbecue follow the photos. |
| Window lounge | Bay, doorway and main fittings retain the plan's arrangement. | Grey sofa, telescope, glass coffee table, black lounge chair and teal low cabinetry replace the proposed curved seating arrangement. |
| Wine cellar and office | Wine cellar has glazing along the hallway and part of the entrance side; the entrance section behind the red painting is solid wall. Hall storage follows the bedroom wall: a 5,830 mm run and a 1,685 mm run separated by the bedroom door, ending at a short wall with a framed drawing. The passage beside the cellar remains clear. | Wraparound bottle racks, warm shelf lighting, display storage, stools and a stone island with waterfall ends follow the cellar interior photo. |
| Second bedroom | Room envelope and bathroom connection retain the plan dimensions. A short entrance leads past a left-hand mirror to the room. Closet fronts are recessed in a solid surround between the entrance and en-suite. | Later bedroom photographs supersede the proposed furniture layout: upholstered bed against the west wall, piano and writing desk opposite, window storage, navy bedding, curtains and ceiling fan. |

## Checks

- Compare a plan overlay of the complete room outlines and partition runs with the door plan.
- Cast rays at three positions along every exterior segment at low, eye and upper-wall heights; test each interior partition above its openings.
- Check every door header against the rendered mesh.
- Check all named viewpoints are clear of obstacles and reachable through doorways and stairs.
- Confirm service voids, the lift car and exterior ledges cannot be entered.
- Confirm both balcony door openings are walkable while the parked glass leaves and outside parapets stop movement.
- Check the shoe-cabinet partition is opaque at eye and ceiling height, and the hallway route stays clear beside wall-mounted cabinetry.
- Review the entrance, yard, bedroom, mirror and other room views in the browser.

The geometry is an authored game model calibrated from the supplied drawings. Ceiling transitions, fittings and furniture shapes remain simplified; these checks do not make it a survey or exact CAD replica.

## Follow-up realism and gameplay pass

Reviewed the video contact sheets and supplied room photographs again. Corrected the sofa/walkway contact, removed the intersecting cupboard and bicycles, moved the fridge against its solid wall section, and retained the glass left of the red painting while closing its backing wall. Solid raised floor volumes now close exposed edges; degenerate clipped polygons are discarded so they cannot create vertical sheets at stairs. Upholstery and stone plinths have distinct faces to avoid depth flicker.

New material tiles use physical UV scaling; the cellar island has a separate breccia stone finish. Added pleated curtains, ceiling fans, finer plants, living-room speakers and small fittings. Furniture, artwork and decorative objects remain approximations rather than scans or exact reproductions.

Movement follows small risers automatically, with collision sliding and optional gentle stair bob. Admitted people remain visible at deterministic waiting places listed in the Shelter notebook. Dialogue and existing saved transcripts use apartment language; ambient voice impressions are explicitly uncertain. The standalone ElevenLabs prompt must also be replaced in the agent dashboard if it still contains older instructions.

## Surface joins and character depth

The later kitchen photo corrects the extra bathroom opening: the only east kitchen doorway is the service entrance, with the refrigerator immediately beside it and a longer return counter on its other side. The bathroom doorway is on the passage side of the partition.

A wider surface audit found overlapping bedroom/office partitions, bath/wardrobe partitions, ceiling edge strips and frame corners. Wall runs now stop at shared boundaries, frame rails meet without overlapping corners, and static opaque box faces are clipped to retain only one surface at each coplanar join. This retains texture coordinates and collision geometry rather than hiding complete meshes. The moving front door stays separate. Regression checks cover partial joins at different angles, nearby distinct surfaces, door headers, external walls, viewpoints and walking routes.

Fallen visitors use closed rounded relief meshes reconstructed from the keyed full-body photographs, with edge colours extended around the sides. The front image still supplies the clothing and facial detail; this is a lightweight textured volume, not a fully rigged anatomical model. An independent fall pivot settles it onto the floor regardless of approach angle. Wounds attach to the surface of the volume. Standing visitors, sheltered people and mirror figures have subtle breathing and occasional head tilts, controlled by the motion setting. These animations use the existing images; no generated video is required.
