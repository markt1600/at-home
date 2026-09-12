// Walkthrough-based approximation in metres, not a measured architectural survey.
const RAW_ROOMS = [
 {id:'hall',name:'Entrance hall',x0:-1.5,x1:1.5,z0:.18,z1:9.4,floor:0},
 {id:'study',name:'Study',x0:-6,x1:-1.5,z0:1,z1:5.7,floor:0},
 {id:'store',name:'Store room',x0:-4.5,x1:-1.5,z0:6.1,z1:8.8,floor:0},
 {id:'living',name:'Living room',x0:-6,x1:5,z0:9.4,z1:17.4,floor:0},
 {id:'dining',name:'Dining room',x0:-12,x1:-6,z0:9.4,z1:17.4,floor:.36},
 {id:'kitchen',name:'Kitchen',x0:-12,x1:-6,z0:3.3,z1:9.4,floor:.36},
 {id:'utility',name:'Utility room',x0:-12,x1:-6,z0:-2.4,z1:3.3,floor:.36},
 {id:'sunroom',name:'Window lounge',x0:-5.5,x1:5,z0:17.4,z1:22,floor:.36},
 {id:'bedroom',name:'Bedroom',x0:5,x1:10.6,z0:9.4,z1:17.4,floor:0},
 {id:'wardrobe',name:'Dressing room',x0:10.6,x1:14.1,z0:9.4,z1:12.5,floor:0},
 {id:'bath',name:'Bathroom',x0:10.6,x1:14.1,z0:12.5,z1:17.4,floor:0},
 {id:'balcony',name:'Balcony',x0:-14.2,x1:-12,z0:10.3,z1:17.4,floor:.36},
];
const RAW_VIEWS = {
 door:[0,1.67,1.1,0,-.015],hall:[0,1.67,3.4,Math.PI,0],corridor:[0,1.67,3.4,Math.PI,0],
 living:[-.2,1.67,10.6,Math.PI,-.015],dining:[-7.1,2.03,11.3,1.05,-.06],
 kitchen:[-9.3,2.03,8.2,0,-.06],utility:[-9,2.03,2,0,-.04],
 study:[-2.5,1.67,3.2,1.1,-.06],media:[-2.5,1.67,3.2,1.1,-.06],
 bedroom:[6,1.67,12,-1.15,-.06],staff:[6,1.67,12,-1.15,-.06],
 sunroom:[-.8,2.03,18.3,Math.PI,-.015],balcony:[-13,2.03,13.3,Math.PI,0],
 wardrobe:[11.4,1.67,10.9,-1.5,-.05],bath:[11.3,1.67,15,-1.2,-.1],
 records:[.3,1.67,7.1,-1.3,-.18],radio:[.4,1.67,1.8,-1.57,-.08],board:[7,1.67,15.25,2.75,.02],
};
export const MODEL_ROOMS=RAW_ROOMS;
export const HOUSE_ROOMS=RAW_ROOMS.map(r=>({...r,x0:-r.x1,x1:-r.x0}));
export const HOUSE_VIEWS=Object.fromEntries(Object.entries(RAW_VIEWS).map(([k,p])=>[k,[-p[0],p[1],p[2],-p[3],p[4]]]));
export function floorHeight(x,z){
 x=-x;
 if(x>=-6.65&&x<=-5.65&&z>=12&&z<=14.8)return .36*Math.max(0,Math.min(1,-x-5.65));
 if(z>=17.1&&z<=17.9&&x>=-2.2&&x<=1.6)return .36*Math.max(0,Math.min(1,(z-17.1)/.8));
 return RAW_ROOMS.find(r=>x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1)?.floor||0;
}
