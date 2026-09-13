// The image faces the camera, so choose the filmed angle from travel relative
// to the camera-to-pet bearing, rather than the camera's yaw alone.
export function petDirection(vx,vz,dx,dz,previous='front'){
 const speed=Math.hypot(vx,vz),distance=Math.hypot(dx,dz);
 if(speed<.001||distance<.001)return {view:previous,side:0};
 const toward=(vx*dx+vz*dz)/(speed*distance),side=(vx*dz-vz*dx)/(speed*distance);
 const threshold=previous==='front'||previous==='back'?.48:.68;
 return {view:toward>threshold?'front':toward<-threshold?'back':'side',side};
}
