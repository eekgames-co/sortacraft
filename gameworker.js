//main thread for Threejs
import * as THREE from 'https://threejs.org/build/three.module.js'
import {CSM} from 'https://threejs.org/examples/jsm/csm/CSM.js'//csm
//import {PointerLockControls} from 'modified_pointerlock.js'//modified pointerlock
const handlers = {
  main,
  mousemove,
  resize,
  keydown,
  keyup
}
//variables
var camera,
scene,
renderer,
controls,
cube,
keys=[],
Chunks = {},
ChunksMesh={},
PlayerChunk,
chunkIndex=[],
done = false,
light,
shadows,
material,
loader,
texture,
sunAngle = -1/6*Math.PI*10,
dayDuration = 1020,
sunSphere,
sunLight,
clock = new THREE.Clock(),
currentVoxel = 1,
cellSize = 64,
tileSize = 16,
tileTextureWidth = 128,
tileTextureHeight= 48,
intersectWorld,
heightMult = 2,
worldTextureLoader = new THREE.ImageBitmapLoader(),
worldTextureBitmap,
positionNumComponents = 3,
normalNumComponents = 3,
lazyVoxelWorld,
jumping=false,
bumping=false,
moved = [],
lazyVoxelData = {
  current:0,//kindof like i
  needsClear:true,//needs to clear
  done:false,//not done
  finishedPosting: false,
  lazyArray:[],//array of data
  lazyArrayTotal:undefined,
  geometryData:undefined,
  getVoxelData: function(inCurrent){//return voxel data @ pos
    let current =inCurrent;//scope
    let theObject;
    if(this.lazyArray.length!=0){
    try{
    theObject = {
      x:this.lazyArray[current].position[0],
      y:this.lazyArray[current].position[1],
      z:this.lazyArray[current].position[2],
      type:this.lazyArray[current].type,
      intersect:{
        x:this.lazyArray[current].intersect[0],
        y:this.lazyArray[current].intersect[1],
        z:this.lazyArray[current].intersect[2],
      }
    }
  }catch(issue){
    theObject = undefined;
  }
  finally {
    return theObject;
  }
  }
},
  lazyLoad: function(){
    let voxelInfo = this.getVoxelData(this.current);
    if(voxelInfo!=undefined){
    lazyVoxelWorld.setVoxel(voxelInfo.x,voxelInfo.y,voxelInfo.z,voxelInfo.type);//set
    intersectWorld.setVoxel(voxelInfo.intersect.x+voxelInfo.x,voxelInfo.intersect.y+voxelInfo.y,voxelInfo.intersect.z+voxelInfo.z,voxelInfo.type);//intersect
    if(this.current<this.lazyArrayTotal){
    this.current+=1;
  }
  if(this.current == this.lazyArrayTotal&&this.lazyArrayTotal>0&&this.done==false){
      this.finish();
  }
  }
},
finish:function(){
  this.done = true;
  this.current = 0;
  var posVec = this.getVoxelData(0).intersect;
  this.lazyArray = [];//reset arry
  loadChunk(posVec.x,posVec.y,posVec.z,lazyVoxelWorld,this.geometryData);//load in chunk
  Chunks[posVec.x+","+posVec.y+","+posVec.z]=lazyVoxelWorld;//chunk lib
  chunkIndex.push(posVec.x+","+posVec.y+","+posVec.z);//chunk index
  done=true;//for new chunks
}
  },//lazy work
  getFPS = {
    lastFrame:0,
    fps:0,
    framerate:function(){
      getFPS.lastFrame = renderer.info.render.frame;
      setTimeout(read,1000);
      function read(){
        getFPS.fps = renderer.info.render.frame - getFPS.lastFrame;
        self.postMessage(['fps',getFPS.fps]);
        requestAnimationFrame(getFPS.framerate);
      }
    }
  },//fps
uvNumComponents = 2;
worldTextureLoader.setOptions({imageOrientation:'flipY'})
worldTextureBitmap = worldTextureLoader.load('textures.png',function(bmap){
worldTextureBitmap = new THREE.CanvasTexture(bmap,undefined,undefined,undefined,THREE.NearestFilter,THREE.NearestFilter);//build texture from xhr req
//worldTextureBitmap = bmap;
  material = new THREE.MeshLambertMaterial({
    color:'gray',
    transparent:true,
    alphaTest:0.1,
    map:worldTextureBitmap,//texture
  });//setup mat
  shadows.setupMaterial(material)

}),
onmessage = function(e) {

  const fn = handlers[e.data.type];

  if (!fn) {
    console.warn('Thread Error: \n What is '+e.data.type+'??')
  }else{
  fn(e.data);
}

};
function checkIntersections(){
  //checking for hits
  var player = {
    x:camera.position.x,
    y:camera.position.y-1.5,
    z:camera.position.z,
  };
  //player info
  //check if any voxels there
  let start = new THREE.Vector3(player.x,player.y,player.z);
  let end = new THREE.Vector3(player.x,camera.position.y,player.z);
//  let start2 = new THREE.Vector3(player.x,camera.position.y,player.z);
//  let end2 = new THREE.Vector3(player.x,camera.position.y,player.z);
  const intersection =intersectWorld.intersectRay(start, end);
  //const intersection2 = intersectWorld.intersectRay(start2,end2);

  if (intersection) {
      //hit
      return true;
  }else{
    return false;
  }
//end
}


function keydown(e){keys[e.key]=true};
function keyup(e){keys[e.key]=false};//key updates.. hah.."KEY" updates? eh? getit? no?nvm

function main(dat){
  camera = new THREE.PerspectiveCamera(70,dat.width/dat.height,0.1,500);
  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer({canvas:dat.canvas});
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  //renderer.shadowMap.autoUpdate=false;
  renderer.shadowMap.needsUpdate=true;
  renderer.setSize(dat.width,dat.height,false);//req.false
  controls = new PointerLockControls(camera);
  camera.position.z = 3;
  camera.position.y = 64;
  var ambient = new THREE.AmbientLight(0xffffff,0.4);
  scene.add(ambient);//ambient light
  shadows = new CSM({
    maxFar:camera.far,
    cascades:4,
    mode:'practical',
    shadowMapSize:1024,
    lightDirection:new THREE.Vector3(-1,-1,1).normalize(),
    parent:scene,
    camera:camera,
    lightIntensity:0.01,
  });
  sunSphere = new THREEx.DayNight.SunSphere();
  scene.add(sunSphere.object3d);
  sunLight = new THREEx.DayNight.SunLight();
  scene.add(sunLight.object3d);
  createChunk(0,0,0);
  renderer.compile(scene,camera);//compile material shaders
  render();
  getFPS.framerate();//start fps counter
}
function render(){

  requestAnimationFrame(render);

  updateDaytime()//update sun

  playerMovement();

  camera.updateMatrixWorld();//req.for shadows

  shadows.update();//update csm

  if(PlayerChunk!='hold'){//dont change unless not hold or undefined
    PlayerChunk = chunkClamp(camera.position,true);//clamp chunk to player area
  }

  manageVoxelLoading();//manage voxel world (if creating)

  lazyLoadChunks();//init lazy loadin g

}

function updateDaytime(){
  sunAngle	+= clock.getDelta()/dayDuration * Math.PI*2;
  sunLight.update(sunAngle);
  sunSphere.update(sunAngle);
  var phase = THREEx.DayNight.currentPhase(sunAngle);
  //bg color
  if( phase === 'day'){
    scene.background = new THREE.Color('rgb(0,120,255)');
  } else if( phase === 'twilight' ){
    scene.background = new THREE.Color("rgb(0," + (120-Math.floor(Math.sin(sunAngle)*240*-1)) + "," + (255-Math.floor(Math.sin(sunAngle)*510*-1)) +")");
  } else {
    scene.background = new THREE.Color('black');
  }
}

function playerMovement(){//move plyr
  moved =[];
  if(keys['w']){
    controls.moveForward(.04);
    moved.push('forward');

  }
  if(keys['a']){
    controls.moveRight(-.04);
    moved.push('left');

  }
  if(keys[' ']){
    camera.position.y+=0.05;
    moved.push('up');
  }
  if(keys['s']){
    controls.moveForward(-.04);
    moved.push('backward');

  }
  if(keys['d']){
    controls.moveRight(.04);
    moved.push('right')

  }
  if(keys['Shift']){
    if(camera.fov!=60){
      camera.fov = 60;
      camera.updateProjectionMatrix();
    }
  }else{
    if(camera.fov!=70){
      camera.fov=70;
      camera.updateProjectionMatrix();
    }
  }
  if(checkIntersections()===true){
    bumping=true;
    goBack(moved);
    renderer.render(scene,camera)
  }else{
    bumping=false;
     camera.position.y-=.05;
      if(checkIntersections()===true){
        console.log('Again!!')
        bumping=true;
        camera.position.y+=.05;
      }
    renderer.render(scene,camera);
  }
}
function goBack(arr){
  for(var i =0;i<arr.length;i++){
    if(arr[i]==='forward'){
      controls.moveForward(-.04)
    }
    if(arr[i]==='backward'){
      controls.moveForward(.04);
    }
    if(arr[i]==='right'){
      controls.moveRight(.04);//swap
    }
    if(arr[i]==='right'){
      controls.moveRight(-.04);//swap
    }
    if(arr[i]==='up'){

    }
  }
}
function resize(dat){
  if(renderer){
    renderer.setSize(dat.width,dat.height,false);//false for offscreen
    camera.aspect = dat.width/dat.height;
    camera.updateProjectionMatrix();//update size
  }
}

function mousemove(dat){
  controls.mousemove({x:dat.moveX,y:dat.moveY});//pas info
}
function inRange(val,min,max){
  return val >=min&&val<=max;//in range of max/min
}
function convInt(x,y,z){
  return new THREE.Vector3(Number(x),Number(y),Number(z));
}

function AABBCollision(point,box){
  return (point.x >= box.minX && point.x <= box.maxX) &&
         (point.z >= box.minZ && point.z <= box.maxZ);
}

var renderDist = 32;//chunks*16

function roundVec(v){
  var roundedX = Number((v.x).toFixed(1));
  var roundedY = Number((v.y).toFixed(1));
  var roundedZ = Number((v.z).toFixed(1));
  var vec = new THREE.Vector3(roundedX,roundedY,roundedZ);
  return vec;
}
function lazyLoadChunks(){
  var clampMin = newChunkClamp({x:camera.position.x - renderDist,z:camera.position.z - renderDist});
  var clampMax = newChunkClamp({x:camera.position.x + renderDist,z:camera.position.z + renderDist});
  for(var x = clampMin.x;x<clampMax.x;x+=16){
    for(var z =clampMin.z;z<clampMax.z;z+=16){
      var clampPos = {x:x,z:z}
      var chunk = Chunks[clampPos.x+",0,"+clampPos.z];
      if(chunk==undefined&&lazyVoxelData.done==true){
        lazyVoxelData.done = false;
        console.log('In req. of chunk');
        createChunk(x,0,z);
      }
    }
  }
}
function loadUnloadChunks(){
  //check if chunks in range
  var chunkNearPlayer = 0;
  var roundCameraPos = roundVec(new THREE.Vector3().clone(camera.position));
  for(var i = 0;i<chunkIndex.length;i++){
    var chunk = ChunksMesh[chunkIndex[i]];
    var strpos = chunkIndex[i].split(',');
    var pos = convInt(strpos[0],strpos[1],strpos[2]);//convert to int
    var maxPos = new THREE.Vector3(pos.x+16,pos.y,pos.z+16);
    var boxPoint  = {
      minX:pos.x,
      maxX:maxPos.x,
      minZ:pos.z,
      maxZ:maxPos.z
    }
    var playerRender ={
      minX:camera.position.x-renderDist,
      maxX:camera.position.x+renderDist,
      minZ:camera.position.z-renderDist,
      maxZ:camera.position.z+renderDist,
    }

    if(AABBCollision(pos,playerRender)===false){
      //not in range of camera, remove
      scene.remove(chunk);//wipe from render
    //  chunk.geometry.dispose();//clear from rem
    //  chunk.material.dispose();//clear from mem
      //chunk = undefined;//remove
      //chunkIndex.slice(i,1);//remove
      //Chunks[pos.x+","+pos.y+","+pos.z]=undefined;//remove
    //  ChunksMesh[pos.x+","+pos.y+","+pos.z]=undefined
    }else{
      chunkNearPlayer+=1;
      if(scene.getObjectByName(chunkIndex[i])===undefined){
        //add this chunk back
        scene.add(chunk);
      }

    }
  }

    if(done===true&&PlayerChunk===undefined){//undefined === need new chunk
    //no chunks near player, create new on
    PlayerChunk='hold';//wait till chunk done
		var signCameraVec1 = signVec(camera.position,true);//get sign
		if(signCameraVec1==true){//positive all
    var clampedPos = newChunkClamp(floorVec(camera.position));
    createChunk(clampedPos.x,0,clampedPos.z,false);//load in a new chunk here
    console.log('New Chunk');
  }else{
		var clampedPos = newChunkClamp(floorVec(camera.position));
		var signCameraVec =signVec(camera.position);//show sign
		if(signCameraVec.x < 0){
			clampedPos.x-=16;//reduce
		}
		if(signCameraVec.z < 0){
			clampedPos.z-=16;
		}
		createChunk(clampedPos.x,0,clampedPos.z);
		console.log('NegNew chunk')
	}
}

}
function signVec(vec,checkSign){//return sign
	if(checkSign===undefined){
	return new THREE.Vector3(Math.sign(vec.x),Math.sign(vec.y),Math.sign(vec.z));
}else{
	var signVec = new THREE.Vector3(Math.sign(vec.x),Math.sign(vec.y),Math.sign(vec.z));
	return signVec.x > 0 && signVec.y > 0 && signVec.z > 0;//check
}
}
function floorVec(v){
return new THREE.Vector3((Math.floor(v.x)),(Math.floor(v.y)),(Math.floor(v.z)));
}
function newChunkClamp(vec){//clamp position for new chunk
  var x = vec.x;
  var z = vec.z;
  var remainedX  = x % 16;
  var remainedZ = z % 16;
  var clampX = x-remainedX;
  var clampZ = z-remainedZ;
  return {x:clampX,z:clampZ}
}

function chunkClamp(vec,pos2){
  //clamp to chunk
  //example: min pos of chunk = x,y,z(0)
  //max pos of chunk = x,y,z+16(all)
  //if input = x,y,z+8 return chunk from above

  var x = vec.x;
  var y=vec.y;
  var z = vec.z;
  for(var i =0;i<chunkIndex.length;i++){
    var chunkName = chunkIndex[i];
    var chunk = Chunks[String(chunkName)];
    var pos = chunkName.split(',');//get x,y,z in arr
    var posMin = {x:Number(pos[0]),y:Number(pos[1]),z:Number(pos[2])};
    var posMax = {
      x:posMin.x+16,
      y:posMin.y+64,
      z:posMin.z+16,
    };
    if(inRange(x,posMin.x,posMax.x)&&inRange(y,posMin.y,posMax.y)&&inRange(z,posMin.z,posMax.z)){
      //inside range, return this chunk
      if(pos2===false){
      return chunk;//chunk
    }else{
      return posMin;//pos
    }
    }else{
      //not this chunk...
    }


  }
}



//DayNight(minify)
var THREEx=THREEx||{};THREEx.DayNight={},THREEx.DayNight.baseURL="/",THREEx.DayNight.currentPhase=function(t){return Math.sin(t)>Math.sin(0)?"day":Math.sin(t)>Math.sin(-Math.PI/6)?"twilight":"night"},THREEx.DayNight.SunLight=function(){var t=new THREE.DirectionalLight(16777215,1);this.object3d=t,this.update=function(i){t.position.x=0,t.position.y=9e4*Math.sin(i),t.position.z=9e4*Math.cos(i);var a=THREEx.DayNight.currentPhase(i);"day"===a?t.color.set("rgb(255,"+(Math.floor(200*Math.sin(i))+55)+","+Math.floor(200*Math.sin(i))+")"):"twilight"===a?(t.intensity=1,t.color.set("rgb("+(255-Math.floor(510*Math.sin(i)*-1))+","+(55-Math.floor(110*Math.sin(i)*-1))+",0)")):t.intensity=0}},THREEx.DayNight.SunSphere=function(){var t=new THREE.SphereGeometry(20,30,30),i=new THREE.MeshBasicMaterial({color:16711680}),a=new THREE.Mesh(t,i);this.object3d=a,this.update=function(t){a.position.x=0,a.position.y=400*Math.sin(t),a.position.z=400*Math.cos(t);var i=THREEx.DayNight.currentPhase(t);"day"===i?a.material.color.set("rgb(255,"+(Math.floor(200*Math.sin(t))+55)+","+(Math.floor(200*Math.sin(t))+5)+")"):"twilight"===i&&a.material.color.set("rgb(255,55,5)")}};
//PointerLockControls(minify)
var PointerLockControls=function(t){var o=this;this.minPolarAngle=0,this.maxPolarAngle=Math.PI;var n,r=new THREE.Euler(0,0,0,"YXZ"),e=Math.PI/2,i=new THREE.Vector3;this.mousemove=function(n){var i=n.x,a=n.y;r.setFromQuaternion(t.quaternion),r.y-=.002*i,r.x-=.002*a,r.x=Math.max(e-o.maxPolarAngle,Math.min(e-o.minPolarAngle,r.x)),t.quaternion.setFromEuler(r)},this.getDirection=(n=new THREE.Vector3(0,0,-1),function(o){return o.copy(n).applyQuaternion(t.quaternion)}),this.moveForward=function(o){i.setFromMatrixColumn(t.matrix,0),i.crossVectors(t.up,i),t.position.addScaledVector(i,o)},this.moveRight=function(o){i.setFromMatrixColumn(t.matrix,0),t.position.addScaledVector(i,o)}};
//VoxelWorld code (minify)
class VoxelWorld {
  constructor(options) {
    this.cellSize = options.cellSize;
    this.tileSize = options.tileSize;
    this.tileTextureWidth = options.tileTextureWidth;
    this.tileTextureHeight = options.tileTextureHeight;
    const {cellSize} = this;
    this.cellSliceSize = cellSize * cellSize;
    this.cells ={};
  }
  computeCellId(x,y,z){
    const {cellSize }= this;
    const cellX = Math.floor(x/cellSize);
    const cellY = Math.floor(y/cellSize);
    const cellZ = Math.floor(z/cellSize);
    return `${cellX},${cellY},${cellZ}`;
  }
  computeVoxelOffset(x, y, z) {
    const {cellSize, cellSliceSize} = this;
    const voxelX = THREE.MathUtils.euclideanModulo(x, cellSize) | 0;
    const voxelY = THREE.MathUtils.euclideanModulo(y, cellSize) | 0;
    const voxelZ = THREE.MathUtils.euclideanModulo(z, cellSize) | 0;
    return voxelY * cellSliceSize +
           voxelZ * cellSize +
           voxelX;
  }
  getCellForVoxel(x, y, z) {
    return this.cells[this.computeCellId(x,y,z)]
  }
  setVoxel(x, y, z, v) {
    let cell = this.getCellForVoxel(x, y, z);
    if (!cell) {
      cell = this.addCellForVoxel(x,y,z);
    }
    const voxelOffset = this.computeVoxelOffset(x, y, z);
    cell[voxelOffset] = v;
  }
  addCellForVoxel(x,y,z){
    const cellId = this.computeCellId(x,y,z);
    let cell =this.cells[cellId];
    if(!cell){
      const {cellSize} = this;
      cell = new Uint8Array(cellSize*cellSize*cellSize);
      this.cells[cellId]=cell;
    }
    return cell;
  }
  getVoxel(x, y, z) {
    const cell = this.getCellForVoxel(x, y, z);
    if (!cell) {
      return 0;
    }
    const voxelOffset = this.computeVoxelOffset(x, y, z);
    return cell[voxelOffset];
  }
	getTransparentVoxel(x,y,z){
		const voxel = this.getVoxel(x,y,z);
		if(voxel===4||voxel===7){
			return true;
		}else{
			return false;
		}
	}
  generateGeometryDataForCell(cellX, cellY, cellZ,rx,ry,rz) {
    const {cellSize, tileSize, tileTextureWidth, tileTextureHeight} = this;
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    const startX = cellX * cellSize;
    const startY = cellY * cellSize;
    const startZ = cellZ * cellSize;

    for (let y = 0; y < cellSize; ++y) {
      const voxelY = startY + y;
      for (let z = 0; z < cellSize; ++z) {
        const voxelZ = startZ + z;
        for (let x = 0; x < cellSize; ++x) {
          const voxelX = startX + x;
          const voxel = this.getVoxel(voxelX, voxelY, voxelZ);
          var realX = rx+voxelX;
          var realZ = rz+voxelZ;
          if (voxel) {
            // voxel 0 is sky (empty) so for UVs we start at 0
            const uvVoxel = voxel - 1;
            // There is a voxel here but do we need faces for it?
            for (const {dir, corners, uvRow} of VoxelWorld.faces) {
              const neighbor = this.getVoxel(
                  voxelX + dir[0],
                  voxelY + dir[1],
                  voxelZ + dir[2]);
                  //||neighbor===4&&voxel!=4||neighbor===7&&voxel!=7
									//transparent voxel handling
									if(this.getTransparentVoxel(voxelX,voxelY,voxelZ)===true){//this is a transparent voxel
										if(neighbor!=voxel){
											//neighbor is not self (transparent) so add
											addFace();
										}
									}else{
										if(!neighbor||this.getTransparentVoxel(voxelX+dir[0],voxelY+dir[1],voxelZ+dir[2])===true){//no neighbor OR neighbor is transparent
											addFace();//face add
										}
									}
							function addFace(){
								const ndx = positions.length / 3;
                for (const {pos, uv} of corners) {
                  positions.push(pos[0] + x, pos[1] + y, pos[2] + z);
                  normals.push(...dir);
                  uvs.push(
                        (uvVoxel +   uv[0]) * tileSize / tileTextureWidth,
                    1 - (uvRow + 1 - uv[1]) * tileSize / tileTextureHeight);
                }
                indices.push(
                  ndx, ndx + 1, ndx + 2,
                  ndx + 2, ndx + 1, ndx + 3,
                );
							}
            }
          }
        }
      }
    }

    return {
      positions,
      normals,
      uvs,
      indices,
    };
  }
   intersectRay(start, end) { //this not by me, it strange physics :3
    let dx = end.x - start.x;
    let dy = end.y - start.y;
    let dz = end.z - start.z;
    const lenSq = dx * dx + dy * dy + dz * dz;
    const len = Math.sqrt(lenSq);

    dx /= len;
    dy /= len;
    dz /= len;

    let t = 0.0;
    let ix = Math.floor(start.x);
    let iy = Math.floor(start.y);
    let iz = Math.floor(start.z);

    const stepX = (dx > 0) ? 1 : -1;
    const stepY = (dy > 0) ? 1 : -1;
    const stepZ = (dz > 0) ? 1 : -1;

    const txDelta = Math.abs(1 / dx);
    const tyDelta = Math.abs(1 / dy);
    const tzDelta = Math.abs(1 / dz);

    const xDist = (stepX > 0) ? (ix + 1 - start.x) : (start.x - ix);
    const yDist = (stepY > 0) ? (iy + 1 - start.y) : (start.y - iy);
    const zDist = (stepZ > 0) ? (iz + 1 - start.z) : (start.z - iz);

    // location of nearest voxel boundary, in units of t
    let txMax = (txDelta < Infinity) ? txDelta * xDist : Infinity;
    let tyMax = (tyDelta < Infinity) ? tyDelta * yDist : Infinity;
    let tzMax = (tzDelta < Infinity) ? tzDelta * zDist : Infinity;

    let steppedIndex = -1;

    // main loop along raycast vector
    while (t <= len) {
      const voxel = this.getVoxel(ix, iy, iz);
      if (voxel) {
        return {
          position: [
            start.x + t * dx,
            start.y + t * dy,
            start.z + t * dz,
          ],
          normal: [
            steppedIndex === 0 ? -stepX : 0,
            steppedIndex === 1 ? -stepY : 0,
            steppedIndex === 2 ? -stepZ : 0,
          ],
          voxel,
        };
      }

      // advance t to next nearest voxel boundary
      if (txMax < tyMax) {
        if (txMax < tzMax) {
          ix += stepX;
          t = txMax;
          txMax += txDelta;
          steppedIndex = 0;
        } else {
          iz += stepZ;
          t = tzMax;
          tzMax += tzDelta;
          steppedIndex = 2;
        }
      } else {
        if (tyMax < tzMax) {
          iy += stepY;
          t = tyMax;
          tyMax += tyDelta;
          steppedIndex = 1;
        } else {
          iz += stepZ;
          t = tzMax;
          tzMax += tzDelta;
          steppedIndex = 2;
        }
      }
    }
    return null;
  }
}


//faces
VoxelWorld.faces = [
  { // left
    uvRow: 0,
    dir: [ -1,  0,  0, ],
    corners: [
      { pos: [ 0, 1, 0 ], uv: [ 0, 1 ], },
      { pos: [ 0, 0, 0 ], uv: [ 0, 0 ], },
      { pos: [ 0, 1, 1 ], uv: [ 1, 1 ], },
      { pos: [ 0, 0, 1 ], uv: [ 1, 0 ], },
    ],
  },
  { // right
    uvRow: 0,
    dir: [  1,  0,  0, ],
    corners: [
      { pos: [ 1, 1, 1 ], uv: [ 0, 1 ], },
      { pos: [ 1, 0, 1 ], uv: [ 0, 0 ], },
      { pos: [ 1, 1, 0 ], uv: [ 1, 1 ], },
      { pos: [ 1, 0, 0 ], uv: [ 1, 0 ], },
    ],
  },
  { // bottom
    uvRow: 1,
    dir: [  0, -1,  0, ],
    corners: [
      { pos: [ 1, 0, 1 ], uv: [ 1, 0 ], },
      { pos: [ 0, 0, 1 ], uv: [ 0, 0 ], },
      { pos: [ 1, 0, 0 ], uv: [ 1, 1 ], },
      { pos: [ 0, 0, 0 ], uv: [ 0, 1 ], },
    ],
  },
  { // top
    uvRow: 2,
    dir: [  0,  1,  0, ],
    corners: [
      { pos: [ 0, 1, 1 ], uv: [ 1, 1 ], },
      { pos: [ 1, 1, 1 ], uv: [ 0, 1 ], },
      { pos: [ 0, 1, 0 ], uv: [ 1, 0 ], },
      { pos: [ 1, 1, 0 ], uv: [ 0, 0 ], },
    ],
  },
  { // back
    uvRow: 0,
    dir: [  0,  0, -1, ],
    corners: [
      { pos: [ 1, 0, 0 ], uv: [ 0, 0 ], },
      { pos: [ 0, 0, 0 ], uv: [ 1, 0 ], },
      { pos: [ 1, 1, 0 ], uv: [ 0, 1 ], },
      { pos: [ 0, 1, 0 ], uv: [ 1, 1 ], },
    ],
  },
  { // front
    uvRow: 0,
    dir: [  0,  0,  1, ],
    corners: [
      { pos: [ 0, 0, 1 ], uv: [ 0, 0 ], },
      { pos: [ 1, 0, 1 ], uv: [ 1, 0 ], },
      { pos: [ 0, 1, 1 ], uv: [ 0, 1 ], },
      { pos: [ 1, 1, 1 ], uv: [ 1, 1 ], },
    ],
  },
];

function manageVoxelLoading(){
  if(lazyVoxelData.needsClear==true){
    //clear for new voxelworld
    lazyVoxelData.finishedPosting = false;//not finished
    lazyVoxelData.needsClear=false;//no clear again
    lazyVoxelData.current = 0;//set back to 0
    lazyVoxelData.geometryData = undefined;//geodata
    lazyVoxelData.lazyArrayTotal = 0;//reset
    lazyVoxelWorld = new VoxelWorld({
      cellSize,
      tileSize,
      tileTextureWidth,
      tileTextureHeight
    });//voxel world
  }
  if(lazyVoxelData.done==false){
    //not finished yet
    //evaulate data
    if(lazyVoxelData.lazyArrayTotal===NaN){
      lazyVoxelData.lazyArrayTotal = 0;
    }
    for(var i = 0;i<240;i++){//load speed
      if(lazyVoxelData.current<lazyVoxelData.lazyArrayTotal){
      lazyVoxelData.lazyLoad();
    }
    }

    console.log(Math.floor((lazyVoxelData.current*100)/lazyVoxelData.lazyArrayTotal)+'% Done');

  }
}


intersectWorld = new VoxelWorld({
  cellSize,
  tileSize,
  tileTextureWidth,
  tileTextureHeight
})

function createChunk(x,y,z){
  if(material){
var chunkWorker = new Worker('chunkworker.js');
var currentBiome = 'caves';
/*
var localVoxelWorld = new VoxelWorld({
cellSize,
tileSize,
tileTextureWidth,
tileTextureHeight
});//local voxel world(cannot share classes)
*/
lazyVoxelData.needsClear = true;//need a clear
chunkWorker.postMessage(['create',16,tileSize,tileTextureWidth,tileTextureHeight,12345,x,y,z,heightMult,currentBiome,2]);
done=false;
var startCount = 0;
chunkWorker.onmessage = function(e){
  if(e.data[0]==='voxel'){
    lazyVoxelData.lazyArray.push({type:e.data[4],intersect:[x,y,z],position:[e.data[1],e.data[2],e.data[3]]});
    startCount+=1;
//    localVoxelWorld.setVoxel(e.data[1],e.data[2],e.data[3],e.data[4]);
    //set in localvoxelworld
  //  intersectWorld.setVoxel(e.data[1]+x,e.data[2]+y,e.data[3]+z,e.data[4]);
  }
  if(e.data[0]==='complete'){
    lazyVoxelData.finishedPosting = true;
    lazyVoxelData.geometryData = [e.data[1],e.data[2],e.data[3],e.data[4]];
    lazyVoxelData.lazyArrayTotal = startCount;//set max
  //  loadChunk(x,y,z,localVoxelWorld);//load in chunk e.data[1] = geo
  //  Chunks[x+","+y+','+z] = localVoxelWorld;//get from pos
  //  chunkIndex.push(x+","+y+","+z);
  //  done=true;
 if(PlayerChunk === 'hold'){PlayerChunk =undefined}//reset
    chunkWorker.terminate();//close worker, there's only so many CPU threads available
  }
}
}else{
  setTimeout(function(){createChunk(x,y,z)},250);
  console.warn('Thread Warning:\n'+'Texture not loaded. Waiting 250ms..')
}
}

function loadChunk(x,y,z,world1,dat){
//load in chunk
//set pos,norm,uv,ind
var positions = dat[0];
var normals = dat[1];
var uvs = dat[2];
var indices =dat[3]
var geometry = new THREE.BufferGeometry();//new buffgeos

geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));

geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));

geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));

geometry.setIndex(indices);

var mesh = new THREE.Mesh(geometry, material);
ChunksMesh[x+","+y+","+z] = mesh;//save chunk @ pos
//shadows
mesh.castShadow =true;
mesh.receiveShadow=true;

mesh.position.set(x,y,z);//set pos
scene.add(mesh)//ad to scene
renderer.shadowMap.needsUpdate=true;//new chunk, need new shadow
}
