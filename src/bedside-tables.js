import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {planPoint} from './house-layout.js';

// Walkthrough 197–203 s and the owner's front-on bedroom photo: two low,
// ivory drawer units beside the west headboard, with their fronts toward the bed's foot.
export function buildBedsideTables(world, root, m) {
  const [headX, bedZ] = planPoint(534, 331);
  const ivory = world.mat(0xded8c7, .48);
  const box = (g, w, h, d, x, y, z, material) => world.box(w, h, d, x, y, z, material, g);
  const cyl = (g, top, bottom, h, x, y, z, material) => world.cyl(top, bottom, h, x, y, z, material, g, 20);
  const soft = (g, w, h, d, x, y, z, material, radius = .008) => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, radius), material);
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh;
  };
  const cable = (g, points, radius = .004) => {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, radius, 6, false), m.black);
    g.add(mesh); return mesh;
  };
  for (const side of [-1, 1]) {
    const g = new THREE.Group();
    g.name = side < 0 ? 'Bedside table by the open shelves' : 'Bedside table by the glass blocks';
    g.position.set(headX + .375, .75, bedZ - side * 1.34);
    g.rotation.y = Math.PI / 2; root.add(g);
    // A recessed plinth and narrow drawer reveals keep the cabinet a solid,
    // handle-free volume, rather than an open-legged side table.
    box(g, .45, .055, .45, 0, .0275, -.005, m.cream);
    soft(g, .52, .424, .51, 0, .258, 0, ivory);
    box(g, .482, .402, .008, 0, .251, .259, m.cream);
    for (const y of [.151, .357]) soft(g, .492, .198, .022, 0, y, .265, ivory, .003);
    soft(g, .52, .020, .53, 0, .475, .002, ivory, .003);
    const top = .485;
    // Matching lamps: fine black bent stems, white saucer shades and black caps.
    const lamp = new THREE.Group(); lamp.name = 'Black stem and white disc bedside lamp';
    lamp.position.set(side * .17, top, -.115); g.add(lamp);
    cyl(lamp, .075, .079, .013, 0, .0065, 0, m.black);
    cable(lamp, [[0,.013,0],[0,.24,0],[0,.322,0],[side * -.037,.331,0],[side * -.072,.331,0]], .006);
    cyl(lamp, .035, .11, .024, -side * .072, .308, 0, m.white);
    cyl(lamp, .11, .106, .008, -side * .072, .292, 0, m.white);
    cyl(lamp, .028, .035, .056, -side * .072, .344, 0, m.black);
    cable(g, [[side*.17,top+.008,-.12],[side*.22,top+.006,-.04],[side*.13,top+.005,.02],[side*.02,top+.006,-.09]]);

    if (side < 0) {
      const diffuser = new THREE.Group(); diffuser.name = 'White bedside diffuser';
      diffuser.position.set(-.10, top, .075); g.add(diffuser);
      cyl(diffuser, .089, .081, .034, 0, .017, 0, m.steel);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(.091, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), m.white);
      dome.position.y = .034; diffuser.add(dome);
      box(diffuser, .05, .015, .005, 0, .025, .087, m.black);
      cyl(diffuser, .008, .008, .003, 0, .126, 0, m.steel);
      soft(g, .055, .013, .13, .10, top+.0065, .14, m.black, .004);
      for (const z of [.105, .137, .161]) box(g, .017, .002, .009, .10, top+.014, z, m.steel);
      cyl(g, .045, .045, .009, .20, top+.0045, .035, m.black);
    } else {
      const tissue = new THREE.Group(); tissue.name = 'Oak bedside tissue box';
      tissue.position.set(-.12, top, -.065); g.add(tissue);
      soft(tissue, .23, .12, .16, 0, .06, 0, m.oak, .005);
      box(tissue, .075, .003, .022, 0, .121, 0, m.black);
      const paper = box(tissue, .067, .032, .009, 0, .134, 0, m.white); paper.rotation.z = .28;
      const speaker = soft(g, .145, .09, .105, .115, top+.047, .105, m.black, .025);
      speaker.name = 'Small black bedside speaker';
      cyl(g, .078, .078, .005, .115, top+.0025, .105, m.steel);
      box(g, .10, .010, .059, -.135, top+.005, .11, m.walnut);
    }
    world.colliders.push({x:g.position.x, z:g.position.z, w:.55, d:.54,
      top:.75+top, handTop:1.61, label:g.name});
  }
}
