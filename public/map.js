import {category} from '/engine.mjs';
import {viewportPoints} from '/geo.mjs';
const $=s=>document.querySelector(s),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=(v,d=0)=>Number.isFinite(v)?v.toFixed(d):'—';
const cities=[['New Delhi',28.6139,77.209],['Mumbai',19.076,72.8777],['Lahore',31.52,74.36],['Dhaka',23.81,90.41],['London',51.5074,-.1278],['Paris',48.8566,2.3522],['Berlin',52.52,13.405],['New York',40.7128,-74.006],['Los Angeles',34.0522,-118.2437],['Toronto',43.6532,-79.3832],['Mexico City',19.4326,-99.1332],['São Paulo',-23.5505,-46.6333],['Cairo',30.0444,31.2357],['Lagos',6.5244,3.3792],['Johannesburg',-26.2041,28.0473],['Dubai',25.2048,55.2708],['Beijing',39.9042,116.4074],['Shanghai',31.2304,121.4737],['Tokyo',35.6762,139.6503],['Seoul',37.5665,126.978],['Bangkok',13.7563,100.5018],['Singapore',1.3521,103.8198],['Jakarta',-6.2088,106.8456],['Sydney',-33.8688,151.2093]].map(([name,latitude,longitude])=>({name,latitude,longitude}));
let map,samples,selected,ctx,view={center:[22,30],zoom:2},serial=0,controller,lastLocation='',lastDemo=false;
export function destroyAirMap(){if(map){view={center:map.getCenter(),zoom:map.getZoom()};map.remove();map=null;}controller?.abort();serial++;lastLocation='';}
function status(text){if($('#map-status'))$('#map-status').textContent=text;}
function pick(p){ctx.onPick(p);}
function utcTime(epoch,zone){return Number.isFinite(epoch)?new Date(epoch*1000).toLocaleString('en-IN',{timeZone:zone||'UTC',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'Unavailable';}
function selectedInfo(){
 const p=ctx.location,key=`${p.latitude},${p.longitude}`;
 if(lastLocation&&key!==lastLocation)map.panTo([p.latitude,p.longitude]);lastLocation=key;
 if(selected)selected.remove();
 selected=L.circleMarker([p.latitude,p.longitude],{radius:13,color:'#163e35',weight:3,fillColor:ctx.data?category(ctx.data.current.us_aqi).color:'#fff',fillOpacity:.85,bubblingMouseEvents:false}).addTo(map).bindTooltip(escape(p.name),{direction:'top'});
 const panel=$('#map-detail');
 if(ctx.busy){panel.innerHTML='<p class="eyebrow">SELECTED LOCATION</p><h2>'+escape(p.name)+'</h2><p class="muted">Retrieving this location’s air quality…</p>';return;}
 if(!ctx.data){panel.innerHTML='<h2>'+escape(p.name)+'</h2><p class="muted">Air quality is unavailable. Choose another point or retry.</p><button class="button" id="point-retry">Retry this point</button>';$('#point-retry').onclick=()=>pick(p);return;}
 const d=ctx.data,c=category(d.current.us_aqi);
 panel.innerHTML=`<p class="eyebrow">${ctx.demo?'ILLUSTRATIVE DEMO':'SELECTED LOCATION'}</p><h2>${escape(p.name)}</h2><p class="fine">${p.latitude.toFixed(4)}°, ${p.longitude.toFixed(4)}°</p><div class="map-aqi" style="color:${c.color}">${number(d.current.us_aqi)}<small>US AQI</small></div><strong style="color:${c.color}">${escape(c.label)}</strong><div class="map-metrics">${[['PM₂.₅',d.current.pm2_5],['PM₁₀',d.current.pm10],['NO₂',d.current.nitrogen_dioxide],['O₃',d.current.ozone]].map(([n,v])=>`<div><span>${n}</span><strong>${number(v,1)} <small>µg/m³</small></strong></div>`).join('')}</div><p class="fine">Valid ${escape(utcTime(d.current.time,d.timezone))}<br>${escape(d.timezone)} · ${ctx.demo?'Sample values':'Open-Meteo / CAMS forecast'}</p><p class="muted">${escape(d.plan.items[0].body)}</p><a class="button map-dashboard-link" href="#overview">View this location’s dashboard ↗</a>`;
}
async function loadSamples(points,label){
 if(ctx.demo){status('Turn off demo data to load real forecast points.');return;}
 controller?.abort();controller=new AbortController();const own=++serial,signal=controller.signal;
 samples.clearLayers();$('#map-point-list').innerHTML='';status('Loading '+label+'…');$('#map-area').disabled=true;$('#map-world').disabled=true;
 const timer=setTimeout(()=>controller?.signal===signal&&controller.abort(),30000);
 try{
 const r=await fetch('/api/map',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({points}),signal});const d=await r.json();if(!r.ok)throw Error(d.error||'Map data unavailable');if(own!==serial||!map||ctx.demo)return;
 d.points.forEach((row,i)=>{
  const p=row.location,c=category(row.current.us_aqi),value=number(row.current.us_aqi);
  const marker=L.marker([p.latitude,p.longitude],{icon:L.divIcon({className:'aqi-map-pin',html:`<span style="background:${c.color}">${value}</span>`,iconSize:[42,32],iconAnchor:[21,16]}),keyboard:true,title:`${p.name}: US AQI ${value}; ${c.label}`,bubblingMouseEvents:false}).addTo(samples);
  marker.bindTooltip(`${escape(p.name)} · ${escape(c.label)}<br>${escape(utcTime(row.current.time,row.timezone))}`,{direction:'top'}).on('click',()=>pick(p));
 });
 $('#map-point-list').innerHTML=d.points.map((row,i)=>`<button class="map-point-row" data-point="${i}"><span>${escape(row.location.name)}</span><strong style="color:${category(row.current.us_aqi).color}">${number(row.current.us_aqi)} <small>US AQI</small></strong></button>`).join('');
 document.querySelectorAll('[data-point]').forEach(b=>b.onclick=()=>pick(d.points[Number(b.dataset.point)].location));
 status(`${d.points.length} forecast points loaded · ${label}. Click a point or anywhere on the map. Pan/zoom, then choose “Load this area” for new samples.`);
 }catch(e){if(own===serial&&map)status(e.name==='AbortError'?'Map request timed out. Try loading this area again.':e.message+' Click anywhere to try a single-location forecast.');}
 finally{clearTimeout(timer);if(own===serial&&map){$('#map-area').disabled=false;$('#map-world').disabled=false;}}
}
export function renderAirMap(context){
 ctx=context;
 if(!$('#air-map')){
  if(map)destroyAirMap();
  $('#view').innerHTML=`<div class="map-toolbar"><div><span class="pill">WORLD AIR QUALITY · US AQI</span><p class="muted">Zoom, drag and click anywhere to make it your active location.</p></div><div class="map-buttons"><button class="button secondary" id="map-home">Selected location</button><button class="button secondary" id="map-world">World cities</button><button class="button" id="map-area">Load this area</button></div></div><div class="map-layout"><section class="map-card"><div id="air-map" role="region" aria-label="Interactive world air quality map. Use arrow keys to pan, plus/minus to zoom, or enter coordinates below."></div><div class="map-legend">${[[50,'Good'],[100,'Moderate'],[150,'Sensitive'],[200,'Unhealthy'],[300,'Very unhealthy'],[301,'Hazardous']].map(([v,n])=>`<span><i style="background:${category(v).color}"></i>${n}</span>`).join('')}</div><div id="map-status" class="map-status" role="status"></div></section><aside class="card" id="map-detail"></aside></div><section class="card coordinate-card"><div><h2>Go to exact coordinates</h2><p class="muted">A map click updates the AQI, pollutants, forecast and daily routine across the app.</p></div><form id="coordinates-form"><label>Latitude<input id="map-lat" type="number" min="-90" max="90" step="any" placeholder="28.6139" required></label><label>Longitude<input id="map-lon" type="number" min="-180" max="180" step="any" placeholder="77.2090" required></label><button class="button">Get AQI ↗</button></form></section><p class="fine">Coloured points are modelled forecasts at sampled coordinates, not monitoring stations or a continuous pollution heatmap. Zooming does not increase the source model’s resolution. Indoor air and street-level differences are not measured here. US AQI is not India NAQI.</p><details class="card map-list"><summary>Explore loaded points as a list</summary><div id="map-point-list"></div></details>`;
  map=L.map('air-map',{minZoom:2,maxZoom:16,worldCopyJump:true}).setView(view.center,view.zoom);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',updateWhenIdle:true,keepBuffer:1}).addTo(map).on('tileerror',()=>status('Some map tiles could not load. Location selection and coordinate lookup still work. Check your connection.'));
  samples=L.layerGroup().addTo(map);selected=null;
  map.on('click',e=>{const p=e.latlng.wrap();pick({name:`Map point ${p.lat.toFixed(3)}, ${p.lng.toFixed(3)}`,latitude:+p.lat.toFixed(5),longitude:+p.lng.toFixed(5)});});
  $('#map-home').onclick=()=>map.setView([ctx.location.latitude,ctx.location.longitude],8);
  $('#map-world').onclick=()=>{map.setView([22,30],2);loadSamples(cities,'world cities');};
  $('#map-area').onclick=()=>{try{const b=map.getBounds();loadSamples(viewportPoints({south:b.getSouth(),north:b.getNorth(),west:b.getWest(),east:b.getEast()}),'this map area');}catch(e){status(e.message);}};
  $('#coordinates-form').onsubmit=e=>{e.preventDefault();const latitude=Number($('#map-lat').value),longitude=Number($('#map-lon').value);pick({name:`Map point ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`,latitude,longitude});map.setView([latitude,longitude],8);};
  lastDemo=ctx.demo;if(!ctx.demo)loadSamples(cities,'world cities');
 }
 if(lastDemo!==ctx.demo){lastDemo=ctx.demo;controller?.abort();serial++;samples.clearLayers();$('#map-point-list').innerHTML='';$('#map-area').disabled=false;$('#map-world').disabled=false;if(!ctx.demo)loadSamples(cities,'world cities');}
 if(ctx.demo)status('Demo mode: the selected point shows sample data. Select a real location or turn demo mode off to retrieve live forecasts.');
 selectedInfo();
}
