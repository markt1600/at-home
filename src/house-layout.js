// Dimensioned doors plan: the 16,880 mm north dimension spans 651 drawing pixels.
// Coordinates are traced from the supplied plan; the original private drawings do not ship.
export const PLAN_SCALE=651/16.88;
export const planPoint=(x,y)=>[(x-881)/PLAN_SCALE,(y-789)/PLAN_SCALE];
const rect=(x0,y0,x1,y1)=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
const room=(id,name,points,floor=.75,ceiling=2.66)=>({id,name,plan:points,polygon:points.map(p=>planPoint(...p)),floor,ceiling});
export const HOUSE_ROOMS=[
 room('hall','Entrance',[[611,632],[947,632],[947,642],[984,642],[984,691],[925,750],[856,819],[755,718],[611,718]],.45,2.495),
 room('lobby','Lift lobby',[[856,819],[925,750],[984,691],[1002,711],[1002,822],[947,877]],.45,2.643),
 {...room('lift','Lift car',[[947,877],[1002,822],[1049,869],[994,924]],.45,2.4),walkable:false},
 room('passage','Main passage',[[415,397],[523,397],[523,415],[853,415],[853,482],[653,482],[653,632],[611,632],[611,532],[317,532],[317,482],[415,482]]),
 room('living','Sunken living room',rect(317,532,562,714),0,2.906),
 room('living_landing','Living landing',rect(562,532,611,718),.45,2.495),
 room('living_south','Dining threshold',rect(317,714,562,739),.45,2.496),
 {...room('balcony','Living balcony',[[317,532],[299,532],[299,548],[245,548],[222,575],[222,670],[245,695],[299,695],[299,714],[317,714]],0,2.906),balcony:true},
 room('dining','Dining room',rect(317,739,523,883),.45,2.969),
 {...room('dining_bay','Dining balcony',[[317,739],[274,739],[248,768],[248,850],[276,883],[317,883]],.45,2.969),balcony:true},
 room('kitchen','Kitchen',rect(523,718,650,883),.45,2.842),
 room('utility','Utility yard',[[650,857],[826,857],[826,903],[788,903],[788,948],[691,948],[691,934],[650,934]],.45,2.989),
 room('service_hall','Service passage',rect(650,808,691,857),.45,2.842),
 room('service_bath','Service bathroom',[[650,718],[691,718],[691,767],[714,767],[714,808],[650,808]],.45,2.842),
 room('service_room','Service room',[[714,786],[823,786],[856,819],[818,857],[691,857],[691,808],[714,808]],.45,2.842),
 room('store','Store room',[[691,718],[755,718],[823,786],[714,786],[714,767],[691,767]],.45,2.495),
 room('wine','Wine cellar',rect(653,482,853,632),.75,2.2),
 room('study','Home office',[[853,531],[984,531],[984,589],[947,589],[947,632],[853,632]],.75,2.48),
 room('east_hall','Second bedroom entrance',rect(853,415,910,531)),
 room('guest','Second bedroom',rect(910,273,1053,457)),
 room('guest_bath','Second bathroom',rect(984,457,1053,563)),
 {...room('guest_storage','Bedroom storage',rect(910,457,984,531)),walkable:false},
 room('wardrobe','Walk-in wardrobe',rect(783,273,910,415)),
 room('bedroom','Main bedroom',[[523,249],[602,249],[602,208],[783,208],[783,415],[523,415]]),
 room('vanity','Bathroom vanity',rect(783,208,868,273)),
 room('bath','Main bathroom',[[868,149],[883,135],[935,135],[952,152],[952,273],[868,273]]),
 room('meditation','Meditation alcove',[[523,149],[538,135],[584,135],[602,153],[602,249],[523,249]]),
 room('theatre','Window lounge',[[299,232],[350,181],[448,181],[476,208],[523,208],[523,397],[331,397],[331,359],[299,332]],.75,2.8),
 room('powder','Powder room',[[299,409],[314,397],[415,397],[415,482],[314,482],[299,468]])
];
export const MODEL_ROOMS=HOUSE_ROOMS;
// Fitted orange seating replaces the raised passage within these footprints.
// The north edge meets the divider at z=482; x=514 is the clear stair jamb.
export const LIVING_SEATING=[rect(514,482,611,570),rect(562,570,611,650)]
 .map(plan=>({plan,polygon:plan.map(p=>planPoint(...p)),floor:.45}));
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
 return LIVING_SEATING.find(r=>pointInPolygon(x,z,r.polygon))?.floor??HOUSE_ROOMS.find(r=>pointInPolygon(x,z,r.polygon))?.floor??.45;
}
export const FRONT_DOOR={center:[890.5,784.5],yaw:Math.PI/4,width:1.865,height:2.2,floor:.45};
export const BALCONY_DOORS=[
 {id:'living-balcony-doors',a:[317,532],b:[317,714],center:[317,623],width:4.37,height:2.906,base:0,kind:'sliding'},
 {id:'dining-balcony-doors',a:[317,739],b:[317,883],center:[317,811],width:3.565,height:2.969,base:.45,kind:'sliding'}
];
export const DOOR_YAW=-Math.PI*3/4;
export const MIRROR_POSITION=[...planPoint(583,393),1.93];
export const MIRROR_YAW=Math.PI;
export const GUEST_MIRROR_POSITION=[...planPoint(880,419),1.93];
// C-23, sheets 67–68: stone vanity and a mirror in front of the window.
export const MASTER_VANITY={center:[826,222.65],width:1.9,depth:.6,height:.9,floor:.75,basinWidth:1.5,basinDepth:.25,mirror:[826,212],mirrorY:2.375,mirrorWidth:1.165,mirrorHeight:1.05};
const view=(x,z,tx,tz,pitch=-.035)=>{const [a,b]=planPoint(x,z),[c,d]=planPoint(tx,tz);return[a,1.67+floorHeight(a,b),b,Math.atan2(a-c,b-d),pitch];};
export const HOUSE_VIEWS={
 door:view(857,751,890.5,784.5,-.02),hall:view(816,680,625,669),lobby:view(942,804,973,850,-.04),corridor:view(630,460,788,459),cabinet_hall:view(595,459,545,453),shoe_cabinet:view(900,709,946,699,-.08),
 living:view(630,676,445,578,-.26),dining:view(493,846,406,806,-.08),kitchen:view(537,841,642,794,-.13),
 utility:view(677,873,738,923,-.12),utility_storage:view(712,833,782,813,-.1),study:view(909,613,864,566,-.08),media:view(909,613,864,566,-.08),
 bedroom_window:view(695,240,695,208,-.14),bedroom:view(747,371,620,326),staff:view(711,390,685,405,-.13),wardrobe:view(847,368,810,315),bath:view(902,241,910,162,-.1),vanity:view(824,251,824,218,-.08),
 sunroom:view(418,350,346,248),theatre:view(418,350,346,248),balcony:view(286,619,218,628),dining_balcony:view(292,812,248,796),
 guest:view(979,435,980,333,-.09),guest_entry:view(866,444,916,435,-.06),guest_closet:view(983,415,947,457,-.04),guest_bath:view(1025,479,997,502,-.15),meditation:view(563,232,561,164),
 wine:view(673,562,787,562),powder:view(393,432,352,465,-.12),store:view(743,739,714,775),
 turntable:view(365,682,333,700,-.7),records:view(763,678,781,636,-.12),radio:view(869,736,909,708),board:view(583,383,570,393,-.015)
};
