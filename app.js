var canvas = document.getElementById('myCanvas');
function getContext(canvas) {
    var contexts = "webgl2,experimental-webgl2".split(",");
    var gl;
    var ctx;
    for (var i = 0; i < contexts.length; i++) {
        ctx = contexts[i];
        gl = canvas.getContext(ctx);
        if (gl) {
            return gl;
        }
    }
    return null;
}
function getVendors() {
    var vendors = "ms,moz,webkit,o".split(",");
    if (!window.requestAnimationFrame) {
        var vendor;
        for (var i = 0; i < vendors.length; i++) {
            vendor = vendors[i];
            window.requestAnimationFrame = window[vendor + 'RequestAnimationFrame'];
            window.cancelAnimationFrame = window[vendor + 'CancelAnimationFrame'] || window[vendor + 'CancelRequestAnimationFrame'];
            if (window.requestAnimationFrame) {
                break;
            }
        }
    }
}
var gl = getContext(canvas);
getVendors();
var size = [ canvas.width, canvas.height ];

if (!gl) {
	alert('Your browser does not support WebGL2');
}
gl.getExtension("OES_texture_float_linear");

var depthProgram = new ShaderProgram();
var depthProgram = new ShaderProgram();
var absorptionProgram = new ShaderProgram();

var depthTexture, depthFbo;

function createDepthFBO() {
    var texWidth = canvas.clientWidth * 2;
    var texHeight = canvas.clientHeight * 2;    /// TODO: QUitar los 2 del viewport y aquí
    depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texWidth, texHeight, 0, gl.RGBA, gl.FLOAT, null);
    depthFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, depthTexture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
        alert("FBO FAILED! ... :(");
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
}
function createBuffer(data) {
	var buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
	return buffer;
}
function addAttrib(attr_name, buffer, numElems) {
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	var attribLocation = depthProgram.attribLocations[attr_name];
	gl.vertexAttribPointer(
		attribLocation, // Attribute location
		numElems, // Number of elements per attribute
		gl.FLOAT, // Type of elements
		gl.FALSE,
		numElems * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
		0 // Offset from the beginning of a single vertex to this attribute
	);
	gl.enableVertexAttribArray(attribLocation);
}
function loadJSON(url, cb) {
	var request = new XMLHttpRequest();
	request.open('GET', url + '?please-dont-cache=' + Math.random(), true);
	request.onload = function () {
		if (request.status < 200 || request.status > 299) {
			console.log('Error: HTTP Status ' + request.status + ' on resource ' + url);
		} else {
			cb(JSON.parse(request.responseText));
		}
	};
	request.send();
}
function createQuad() {
    var positions = [
        -1.0,  -1.0, 
         1.0,  -1.0, 
        -1.0,   1.0, 
         1.0,   1.0
    ];

    var planeVAO = gl.createVertexArray();  
    gl.bindVertexArray(planeVAO);  
    var planeVertexVBO = gl.createBuffer();  
    gl.bindBuffer(gl.ARRAY_BUFFER, planeVertexVBO);  
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    return planeVAO;
}
function drawQuad(planeVAO) {
    gl.bindVertexArray(planeVAO);  
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);  
}
var init = function () {
    // Create depth program
    depthProgram = new ShaderProgram();
    depthProgram.addShader("shaders/depthShader.vert", gl.VERTEX_SHADER, mode.read_file);
    depthProgram.addShader("shaders/depthShader.frag", gl.FRAGMENT_SHADER, mode.read_file);
    depthProgram.compile_and_link();
    console.log("Depth Shader load ok");
	depthProgram.addAttributes(["vertPosition", "vertNormal", "vertTexCoord"])
    depthProgram.addUniforms(["model", "view", "projection", "ExpFresnel"]);
    console.log(depthProgram.uniformLocations);

    absorptionProgram = new ShaderProgram();
    absorptionProgram.addShader("shaders/absorptionShader.vert", gl.VERTEX_SHADER, mode.read_file);
    absorptionProgram.addShader("shaders/absorptionShader.frag", gl.FRAGMENT_SHADER, mode.read_file);
    absorptionProgram.compile_and_link();
    console.log("Absorption Shader load ok");
    absorptionProgram.addUniforms(["Kd", "Sigma", "TronEffect"]);
    console.log(absorptionProgram.uniformLocations);

	loadJSON('dragon.json', function(modelObj) {
		RunDemo(modelObj);
	});
};

var RunDemo = function (ObjModel) {
	createDepthFBO();
	gl.enable(gl.DEPTH_TEST);
	var susanIndices = [].concat.apply([], ObjModel.meshes[0].faces);

	function createVAO(model, indicesArray) {
		var vao = gl.createVertexArray();  
		gl.bindVertexArray(vao);

		var indexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indicesArray), gl.STATIC_DRAW);

		addAttrib("vertPosition", createBuffer(model.meshes[0].vertices), 3);
		addAttrib("vertNormal", createBuffer(model.meshes[0].normals), 3);
		//addAttrib("vertTexCoord", createBuffer(model.meshes[0].texturecoords[0]), 2);

		gl.bindVertexArray(null); 
		return vao;
	}

	var vao = createVAO(ObjModel, susanIndices);
  	
	depthProgram.use();

	var model = mat4.create();
	var view = mat4.create();
	var projection = mat4.create();
	mat4.identity(model);

	var cam = new Camera([0, 0, 8]);
	view = cam.GetViewMatrix();
	projection = cam.GetProjectionMatrix();
	gl.uniformMatrix4fv(depthProgram.uniformLocations['view'], gl.FALSE, view);
	gl.uniformMatrix4fv(depthProgram.uniformLocations['projection'], gl.FALSE, projection);

	var planeVAO = createQuad();

	var identityMatrix = mat4.create();
	mat4.identity(identityMatrix);
	var angle = 0;
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
    var lastTime = Date.now();

    function updateMatrices() {
        var currentTime = Date.now();
        var timeElapsed = currentTime - lastTime;
        lastTime = currentTime;
        if(config.Rotate) { 
			angle += timeElapsed * 0.001;
			if(angle >= 180.0) {
				angle = -180.0;
			}
        }
		mat4.translate(model,identityMatrix, vec3.fromValues(0.0, -1.0, 0.0));
		mat4.rotateY(model, model, 90.0 * Math.PI / 180);
		mat4.rotateY(model, model, angle);
        mat4.scale(model, model, vec3.fromValues(0.35, 0.35, 0.35));
    }
    function renderDepth() {
        depthProgram.use();
		gl.uniformMatrix4fv(depthProgram.uniformLocations["model"], gl.FALSE, model);

        gl.uniform1f(depthProgram.uniformLocations["ExpFresnel"], config.ExpFresnel);
        gl.bindFramebuffer(gl.FRAMEBUFFER, depthFbo);
        gl.viewport(0, 0, 2 * canvas.clientWidth, 2 * canvas.clientHeight);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
		gl.clear(gl.COLOR_BUFFER_BIT);

  		gl.bindVertexArray(vao);  
		gl.drawElements(gl.TRIANGLES, susanIndices.length, gl.UNSIGNED_SHORT, 0);
  		gl.bindVertexArray(null);
        gl.disable(gl.BLEND);
    }

    function renderFresnel() {
        absorptionProgram.use();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        var color = [config.Color[0]/255, config.Color[1]/255, config.Color[2]/255];
        gl.uniform3fv(absorptionProgram.uniformLocations["Kd"], color);
        gl.uniform1f(absorptionProgram.uniformLocations["Sigma"], config.Sigma);
        gl.uniform1i(absorptionProgram.uniformLocations["TronEffect"], config.TronEffect);
        gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
		gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindTexture(gl.TEXTURE_2D, depthTexture);
  		drawQuad(planeVAO);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

	var render = function () {
        if (gl.NO_ERROR != gl.getError()) {
            alert(gl.getError());
        }
        stats.begin();

        updateMatrices();
        renderDepth();
        renderFresnel();

        stats.end();

		window.requestAnimationFrame(render);
	};
	window.requestAnimationFrame(render);
};

var Config = function() {
    this.Color = [ 0, 210, 10 ];
    this.Sigma = 150.0;
    this.TronEffect = true;
    this.Rotate = true;
    this.ExpFresnel = 3.0;
};

var config;
var stats = new Stats();

window.addEventListener("load", function () {
    stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild( stats.domElement );
    config = new Config();
    gui = new dat.GUI();
    gui.addColor(config, 'Color');
    gui.add(config, "Sigma", 1.0, 1000.0);
    gui.add(config, "TronEffect");
    gui.add(config, "Rotate");
    gui.add(config, "ExpFresnel", 0.1, 20.0);
    init();
});