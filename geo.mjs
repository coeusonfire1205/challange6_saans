export function normalizeLocation(input={}) {
 const valid=v=>(typeof v==='number'||typeof v==='string'&&v.trim()!=='')&&Number.isFinite(Number(v));
 if(!input||!valid(input.latitude)||!valid(input.longitude))throw new Error('Valid latitude and longitude are required');
 const latitude=Number(input.latitude),longitude=Number(input.longitude);
 if(Math.abs(latitude)>90||Math.abs(longitude)>180)throw new Error('Coordinates are outside the world map');
 return {name:String(input.name||`${latitude.toFixed(3)}, ${longitude.toFixed(3)}`).slice(0,100),latitude,longitude};
}
export function normalizePoints(points){
 if(!Array.isArray(points)||points.length<1||points.length>24)throw new Error('Choose between 1 and 24 map points');
 return points.map(normalizeLocation);
}
export function mapResults(raw,locations){
 const rows=Array.isArray(raw)?raw:[raw];
 if(rows.length!==locations.length)throw new Error('Incomplete map forecast response. Please retry.');
 return rows.map((r,i)=>({location:locations[i],current:r?.current||{},timezone:r?.timezone||'UTC'}));
}
export function viewportPoints(bounds){
 const {south,north,west,east}=bounds;
 if(![south,north,west,east].every(Number.isFinite)||north<=south||east<=west)throw new Error('Invalid map bounds');
 const s=Math.max(-80,south),n=Math.min(80,north),span=Math.min(360,east-west);
 if(n<=s)throw new Error('Pan the map towards populated latitudes');
 const points=[];
 for(let y=0;y<4;y++)for(let x=0;x<5;x++){
  const latitude=+(s+(n-s)*(y+.5)/4).toFixed(4);
  const longitude=+(((west+span*(x+.5)/5+180)%360+360)%360-180).toFixed(4);
  points.push(normalizeLocation({latitude,longitude}));
 }
 return points;
}
