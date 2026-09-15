import * as THREE from 'three';

export const ARM_LENGTHS=[.36,.34];
const up=new THREE.Vector3(0,1,0);

// Swept limb volume against an oriented solid, including the sleeve's radius.
export function armIntersectsBox(a,b,box,radius=.04){
 const p=a.clone().applyMatrix4(box.inverse),q=b.clone().applyMatrix4(box.inverse);let lo=0,hi=1;
 for(const axis of ['x','y','z']){
  const d=q[axis]-p[axis],min=box.min[axis]-radius,max=box.max[axis]+radius;
  if(Math.abs(d)<1e-8){if(p[axis]<min||p[axis]>max)return false;continue;}
  let x=(min-p[axis])/d,y=(max-p[axis])/d;if(x>y)[x,y]=[y,x];lo=Math.max(lo,x);hi=Math.min(hi,y);if(lo>hi)return false;
 }
 return true;
}
export function armBox(anchor,min,max,name='furniture'){
 anchor.updateWorldMatrix(true,false);return {inverse:anchor.matrixWorld.clone().invert(),min:new THREE.Vector3(...min),max:new THREE.Vector3(...max),name};
}
export function solveArm(shoulder,wrist,pole,obstacles=[],previous){
 const [upper,lower]=ARM_LENGTHS,axis=wrist.clone().sub(shoulder),distance=axis.length();
 if(distance>upper+lower-.003||distance<Math.abs(upper-lower)+.003)return null;
 axis.normalize();const along=(upper*upper-lower*lower+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-along*along));
 const base=shoulder.clone().addScaledVector(axis,along),normal=pole.clone().addScaledVector(axis,-pole.dot(axis)).normalize();
 if(normal.lengthSq()<.01)normal.crossVectors(axis,up).normalize();
 let best=null,score=Infinity;
 for(let n=0;n<24;n++){
  const angle=(n%2?1:-1)*Math.ceil(n/2)*Math.PI/12,elbow=normal.clone().applyAxisAngle(axis,angle).multiplyScalar(height).add(base);
  if(obstacles.some(box=>armIntersectsBox(shoulder,elbow,box,.045)||armIntersectsBox(elbow,wrist,box,.038)))continue;
  const cost=Math.abs(angle)*.025+(previous?elbow.distanceToSquared(previous)*2:0);
  if(cost<score){score=cost;best=elbow;}
 }
 return best;
}
