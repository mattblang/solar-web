var container, scene, camera, renderer, controls, stats, projector, loader;

// state variables
var revolutionActive = false;

// mesh handles
var planets = {};
var sun = null;
var spaceStation = null;
var focusedObject = null;

// constants
var FOCUS_DISTANCE = 100; // distance between camera and obj on focus
var ORBIT_RESOLUTION = 100; // resolution of the orbits
var STARTING_X = 0;
var STARTING_Y = 450;
var STARTING_Z = 900;
var SKYBOX_SIZE = 12000;

function initGL() {
	// scene
	scene = new THREE.Scene();
	
	// camera
	var screenWidth = window.innerWidth;
	var screenHeight = window.innerHeight;
	var viewAngle = 45
	var aspect = screenWidth / screenHeight;
	var near = 0.1;
	var far = 20000;
	camera = new THREE.PerspectiveCamera(viewAngle, aspect, near, far);
	scene.add(camera);
	camera.position.set(STARTING_X, STARTING_Y, STARTING_Z);
	camera.lookAt(scene.position);
	
	// renderer
	renderer = new THREE.WebGLRenderer({antialias: true});
	renderer.setSize(screenWidth, screenHeight);
	container = document.getElementById("main-canvas");
	container.appendChild(renderer.domElement);
	
	// conrols
	controls = new THREE.OrbitControls(camera, container);
	controls.userZoomSpeed = 2.0;
	
	// stats
	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.bottom = '0px';
	stats.domElement.style.zIndex = 100;
	container.appendChild(stats.domElement);
	
	// window resize utility
	THREEx.WindowResize(renderer, camera);	
	
	// projector (for object detection with raycasting)
	projector = new THREE.Projector();
	
	// model loader
	loader = new THREE.JSONLoader();
	
	// events
	container.addEventListener("dblclick", onDblClick);
	$(document).keyup(onKeyup);
	
	// lights
	var light = new THREE.PointLight(0xffffff);
	light.position.set(0, 250, 0);
	scene.add(light);
	
	// axes helper
	var axes = new THREE.AxisHelper(200);
	scene.add(axes);
	
	// skybox (or in this case, universe box)
	var materialArray = [];
	var starTexture = THREE.ImageUtils.loadTexture("textures/stars.png");
	for(var i = 0; i < 6; i++) {
		materialArray.push(new THREE.MeshBasicMaterial({map: starTexture, side: THREE.BackSide}));
	}
	var skyGeometry = new THREE.CubeGeometry(SKYBOX_SIZE, SKYBOX_SIZE, SKYBOX_SIZE);
	var skyMaterial = new THREE.MeshFaceMaterial(materialArray);
	var skyBox = new THREE.Mesh(skyGeometry, skyMaterial);
	skyBox.type = "skybox";
	scene.add(skyBox);
	
	drawSolarSystem();
	
	animate();
}

function drawSolarSystem() {
	
	// sun
	geometry = new THREE.SphereGeometry(50, 10, 10);
	material = new THREE.MeshBasicMaterial({color: 0xFFCC33, wireframe: true});
	sun = new THREE.Mesh(geometry, material);
	sun.position.set(0, 0, 0);
	sun.name = "sun";
	scene.add(sun);
	
	// mercury
	drawPlanet(20, THREE.ImageUtils.loadTexture("textures/mercurymap.jpg"), "mercury");
	drawOrbit("mercury");
		
	// venus
	drawPlanet(20, THREE.ImageUtils.loadTexture("textures/venusmap.jpg"), "venus");
	drawOrbit("venus");
		
	// earth
	drawPlanet(20, THREE.ImageUtils.loadTexture("textures/earth.jpg"), "earth");
	drawOrbit("earth");
	
	// mars
	drawPlanet(20, THREE.ImageUtils.loadTexture("textures/mars_1k_color.jpg"), "mars");
	drawOrbit("mars");
	
	// jupiter
	drawPlanet(50, THREE.ImageUtils.loadTexture("textures/jupitermap.jpg"), "jupiter");
	drawOrbit("jupiter");
		
	// saturn
	drawPlanet(50, THREE.ImageUtils.loadTexture("textures/saturnmap.jpg"), "saturn");	
	drawOrbit("saturn");
	
	// uranus
	drawPlanet(50, THREE.ImageUtils.loadTexture("textures/uranusmap.jpg"), "uranus");	
	drawOrbit("uranus");
	
	// neptune
	drawPlanet(50, THREE.ImageUtils.loadTexture("textures/neptunemap.jpg"), "neptune");	
	drawOrbit("neptune");
	
	// pluto
	drawPlanet(10, THREE.ImageUtils.loadTexture("textures/plutomap1k.jpg"), "pluto");	
	drawOrbit("pluto");
		
	// super secret space station of the Jankun-Kelloids
	loader.load("models/I.G.R.S.js", function(geometry) {
		material = new THREE.MeshLambertMaterial(0x999999);
		spaceStation = new THREE.Mesh(geometry, material);
		spaceStation.scale.set(5, 5, 5);
		spaceStation.position.set(300, 50, 0);
		scene.add(spaceStation);
	});
}

function drawPlanet(radius, texture, name) {
	// reference: http://math.stackexchange.com/questions/253108/generate-random-points-on-the-perimeter-of-a-circle				
	var planetAngle = Math.random() * Math.PI * 2;
	
	var distanceFromSun = scale(planetData[name].distanceFromSun, 
		planetData.ranges.distanceFromSunMin, 
		planetData.ranges.distanceFromSunMax,
		planetData.ranges.distanceFromSunScaleMin,
		planetData.ranges.distanceFromSunScaleMax);
		 
	var px = Math.cos(planetAngle) * distanceFromSun;
	var py = 0;
	var pz = Math.sin(planetAngle) * distanceFromSun;

	var geometry = new THREE.SphereGeometry(radius, 50, 50);
	var material = new THREE.MeshBasicMaterial({map: texture});
	var mesh = new THREE.Mesh(geometry, material);
	mesh.position.set(px, py, pz);
	mesh.name = name;
	mesh.planetAngle = planetAngle;
	
	mesh.revolutionTheta = scale(planetData[name].orbitalVelocity, 
		planetData.ranges.orbitalVelocityMin,
		planetData.ranges.orbitalVelocityMax,
		planetData.ranges.orbitalVelocityScaleMin,
		planetData.ranges.orbitalVelocityScaleMax);
		
	scene.add(mesh);
	planets[name] = mesh;		
}

function drawOrbit(name) {
	var size = 360 / ORBIT_RESOLUTION;
	var geometry = new THREE.Geometry();
	var material = new THREE.LineBasicMaterial({color:0xFFFFFF, opacity: 0.8});
	
	var distanceFromSun = scale(planetData[name].distanceFromSun, 
		planetData.ranges.distanceFromSunMin, 
		planetData.ranges.distanceFromSunMax,
		planetData.ranges.distanceFromSunScaleMin,
		planetData.ranges.distanceFromSunScaleMax);
	
	var segment = null;
	for(var i = 0; i <= ORBIT_RESOLUTION; i++) {
		segment = (i * size) * Math.PI / 180;
		geometry.vertices.push(new THREE.Vector3(Math.cos(segment) * distanceFromSun, 0, Math.sin(segment) * distanceFromSun));
	}
	line = new THREE.Line(geometry, material);
	scene.add(line);	
}

function onDblClick(event) {
	var vector = new THREE.Vector3((event.clientX / window.innerWidth) * 2 - 1, - (event.clientY / window.innerHeight) * 2 + 1, 0.5);
	projector.unprojectVector(vector, camera);
	var raycaster = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
	
	var intersects = [];
	intersects = raycaster.intersectObjects(scene.children);
	
	if (intersects.length > 0) {
		var obj = intersects[0].object; // closest intersected object			
		
		focusObject(obj);
	}	
}

function onKeyup(event) {
	// reference: http://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes
	
	switch(event.which) {
		case 17:
			revolutionActive = !revolutionActive;
			
			break;
		case 32:
			focusObject(null);
			break;
		case 48:
			focusObject(sun);
			break;
		case 49:
			focusObject(planets["mercury"]);
			break;
		case 50:
			focusObject(planets["venus"]);
			break;
		case 51:
			focusObject(planets["earth"]);
			break;
		case 52:
			focusObject(planets["mars"]);
			break;
		case 53:
			focusObject(planets["jupiter"]);
			break;
		case 54:
			focusObject(planets["saturn"]);
			break;
		case 55:
			focusObject(planets["uranus"]);
			break;
		case 56:
			focusObject(planets["neptune"]);
			break;
		case 57:
			focusObject(planets["pluto"]);
			break;
		case 191:
			focusObject(spaceStation);
			break;
		default:
			console.log("unrecognized key input");
	}
}

function focusObject(obj) {
	if(obj == null) {
		// move camera's position
		new TWEEN.Tween(camera.position).to({
			x: STARTING_X,
			y: STARTING_Y,
			z: STARTING_Z}, 750)
		.start();	
		
		// move camera's look at
		new TWEEN.Tween(controls.center).to({
			x: 0,
			y: 0,
			z: 0}, 750)
		.start();		
		
		focusedObject = null;	
		$("#viz-wrapper").fadeOut("slow");		
	}
	else if(obj.type != "skybox") {
		// compute the position of the new camera location
		var A = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z);
		var B = new THREE.Vector3(obj.position.x, obj.position.y, obj.position.z);
		var AB = new THREE.Vector3((B.x - A.x), (B.y - A.y), (B.z - A.z));
		AB.normalize();
		var newLoc = B.sub((AB.multiplyScalar(obj.geometry.boundingSphere.radius + FOCUS_DISTANCE)));
		
		// first tween to starting position
		var tweenPosition1 = new TWEEN.Tween(camera.position).to({
			x: STARTING_X,
			y: STARTING_Y,
			z: STARTING_Z}, 750);
		
		var tweenPosition2 = new TWEEN.Tween(camera.position).to({
			x: newLoc.x,
			y: newLoc.y,
			z: newLoc.z}, 750);
				
		var tweenCenter2 = new TWEEN.Tween(controls.center).to({
			x: obj.position.x,
			y: obj.position.y,
			z: obj.position.z}, 750);	
		
		tweenPosition1.chain(tweenPosition2).start();
		tweenCenter2.start();
		
		// set focused object
		focusedObject = obj;		
		$("#viz-wrapper").css("visibility", "visible").hide().fadeIn("slow");
		
		// load object's visualizations
		loadCharts(obj.name);
	}	
}

function animate() {
	requestAnimationFrame(animate);
	render();
	update();	
}

function render() {
	renderer.render(scene, camera);
}

function update() {
	controls.update();
	stats.update();
	TWEEN.update();
	
	if(focusedObject) {
		focusedObject.rotation.y += .03;
	}
 
	if(revolutionActive) {
		// reference: http://stackoverflow.com/questions/10894484/get-key-value-of-dictionary-by-index-in-jquery
		$.each(planets, function(key, value) {
			var planetAngle = value.planetAngle + value.revolutionTheta;
			value.planetAngle = planetAngle // store new planetAngle
			
			var distanceFromSun = scale(planetData[key].distanceFromSun, 
				planetData.ranges.distanceFromSunMin, 
				planetData.ranges.distanceFromSunMax,
				planetData.ranges.distanceFromSunScaleMin,
				planetData.ranges.distanceFromSunScaleMax);			
			
			var px = Math.cos(planetAngle) * distanceFromSun;
			var py = 0;
			var pz = Math.sin(planetAngle) * distanceFromSun;
			
			planets[key].position.set(px, py, pz);
		});
	}
	
}

function scale(value, min, max, scaleMin, scaleMax) {
	// reference: http://stackoverflow.com/questions/14224535/scaling-between-two-number-ranges
	var percent = (value - min) / (max - min);
	
	return percent * (scaleMax - scaleMin) + scaleMin;
}
