// Dimensioned doors plan: the 16,880 mm north dimension spans 651 drawing pixels.
// Coordinates are traced from the supplied plan; the original private drawings do not ship.
export const PLAN_SCALE=651/16.88;
export const planPoint=(x,y)=>[(x-881)/PLAN_SCALE,(y-789)/PLAN_SCALE];
const rect=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
const room=(id,name,points,floor=.75,ceiling=2.66)=>({id,name,plan:points,polygon:points.map(p=>planPoint(...p)),floor,ceiling});
export const HOUSE_ROOMS=[
 room('hall','Entrance',[[611,632],[984,632],[984,706],[944,706],[908,762],[854,816],[756,718],[611,718]],.45,2.495),
 room('passage','Main passage',[[415,397],[523,397],[523,415],[853,415],[853,482],[653,482],[653,632],[611,632],[611,532],[317,532],[317,482],[415,482]]),
 room('living','Sunken living room',rect(317,532,562,714),0,2.906),
 room('living_landing','Living landing',rect(562,532,611,718),.45,2.495),
 room('living_south','Dining threshold',rect(317,714,562,739),.45,2.496),
 room('balcony','Living bay',[[317,548],[245,548],[222,575],[222,670],[245,695],[317,695]],0,2.906),
 room('dining','Dining room',rect(317,739,523,883),.45,2.969),
 room('dining_bay','Dining balcony',[[317,741],[274,741],[248,768],[248,850],[276,883],[317,883]],.45,2.969),
 room('kitchen','Kitchen',rect(523,718,650,883),.45,2.842),
 room('utility','Utility yard',[[650,857],[826,857],[826,907],[851,920],[851,953],[650,953]],.45,2.989),
 room('service_hall','Service passage',rect(650,816,691,857),.45,2.842),
 room('service_bath','Service bathroom',rect(650,718,691,816),.45,2.842),
 room('service_room','Service room',[[691,786],[822,786],[875,857],[691,857]],.45,2.842),
 room('store','Store room',[[691,718],[756,718],[824,786],[691,786]],.45,2.495),
 room('wine','Wine cellar',rect(653,482,853,632),.75,2.2),
 room('study','Home office',rect(853,531,984,632),.75,2.48),
 room('east_hall','Bedroom passage',rect(853,432,910,531)),
 room('guest','Second bedroom',rect(910,273,1053,457)),
 room('guest_bath','Second bathroom',rect(984,457,1053,563)),
 room('wardrobe','Walk-in wardrobe',rect(783,273,910,432)),
 room('bedroom','Main bedroom',rect(523,249,783,415)),
 room('bedroom_hall','Bedroom gallery',rect(602,208,868,273)),
 room('bath','Main bathroom',[[868,135],[942,135],[952,150],[952,254],[868,254]]),
 room('meditation','Meditation alcove',[[521,149],[538,135],[584,135],[601,149],[601,249],[521,249]]),
 room('theatre','Window lounge',[[299,232],[350,181],[448,181],[476,208],[519,208],[519,397],[331,397],[331,359],[299,332]],.75,2.8),
 room('powder','Powder room',[[299,409],[314,397],[415,397],[415,482],[314,482],[299,468]])
];
export const MODEL_ROOMS=HOUSE_ROOMS;
export const HOUSE_STAIRS=[
 {id:'entry',plan:rect(611,611,653,650),axis:'z',reverse:true,low:.45,high:.75,risers:2},
 {id:'office_entry',plan:rect(910,625,947,664),axis:'z',reverse:true,low:.45,high:.75,risers:2},
 {id:'living_east',plan:rect(539,650,611,714),axis:'x',low:0,high:.45,risers:3},
 {id:'living_south',plan:rect(431,707,523,739),axis:'z',low:0,high:.45,risers:3},
 {id:'living_north',plan:rect(458,479,514,532),axis:'z',reverse:true,low:0,high:.75,risers:5}
].map(s=>({...s,polygon:s.plan.map(p=>planPoint(...p))}));
export function pointInPolygon(x,z,p){
 let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){
  const [ax,az]=p[i],[bx,bz]=p[j],cross=(x-ax)*(bz-az)-(z-az)*(bx-ax);
  if(Math.abs(cross)<1e-7&&x>=Math.min(ax,bx)-1e-7&&x<=Math.max(ax,bx)+1e-7&&z>=Math.min(az,bz)-1e-7&&z<=Math.max(az,bz)+1e-7)return true;
  if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;
 }return inside;
}
export function floorHeight(x,z){
 for(const s of HOUSE_STAIRS)if(pointInPolygon(x,z,s.polygon)){
  const axis=s.axis==='x'?0:1,values=s.polygon.map(p=>p[axis]),lo=Math.min(...values),hi=Math.max(...values);
  const t=((axis===0?x:z)-lo)/(hi-lo);return s.low+(s.high-s.low)*(s.reverse?1-t:t);
 }
 return HOUSE_ROOMS.find(r=>pointInPolygon(x,z,r.polygon))?.floor??.45;
}
export const DOOR_YAW=-Math.PI*3/4;
export const VISITOR_POSITION=[.51,.45,.51];
export const MIRROR_POSITION=[...planPoint(768,271),1.79];
const view=(x,z,tx,tz,pitch=-.035)=>{const [a,b]=planPoint(x,z),[c,d]=planPoint(tx,tz);return[a,1.67+floorHeight(a,b),b,Math.atan2(a-c,b-d),pitch];};
export const HOUSE_VIEWS={
 door:view(851,759,881,789,-.02),hall:view(816,680,625,669),corridor:view(627,570,600,450),
 living:view(471,627,453,561,-.08),dining:view(493,846,406,806,-.08),kitchen:view(615,803,560,729,-.1),
 utility:view(750,919,682,903),study:view(945,596,864,566,-.08),media:view(945,596,864,566,-.08),
 bedroom:view(757,372,609,320),staff:view(693,389,685,408,-.13),wardrobe:view(847,379,810,315),bath:view(898,228,910,162,-.1),
 sunroom:view(443,348,346,248),theatre:view(443,348,346,248),balcony:view(282,607,240,626),
 guest:view(938,416,1010,355),guest_bath:view(1014,534,1039,491),meditation:view(563,232,561,164),
 wine:view(673,562,787,562),powder:view(386,455,329,434),store:view(743,739,714,775),
 records:view(763,678,749,639,-.12),radio:view(869,736,909,708),board:view(757,308,768,271,-.015)
};
