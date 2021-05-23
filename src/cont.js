window.w = window.innerWidth
window.h = window.innerHeight
const canvas = document.getElementById("canvas");
function resizeCanvas() {
	canvas.style.width = '100%';
	canvas.style.height= '100%';

	canvas.width  = canvas.offsetWidth;
	canvas.height = canvas.offsetHeight;

}
window.onResize = resizeCanvas;

window.savebuffer = 0.;
window.savebuffer1 = 0.;
window.savebuffer2 = 0.;
window.mix = 0.5;
window.sliderX = 0.5;
window.sliderY = 0.001;
window.guiData = {};
window.gui;

function  addGuiControls(){
    gui = new dat.GUI();
    gui.remember(this);

    guiData = {
        "savebuffer":false,
        "savebuffer1":false,
        "savebuffer2":false,
        "mix":0.5,
        "mix1":0.,
        "mix2":0.,
        "sliderX":0.001,
        "sliderY":0.001,
        "frames":0.001,
    };
    gui.add(guiData, 'savebuffer');
    gui.add(guiData, 'savebuffer1');
    gui.add(guiData, 'savebuffer2');
    gui.add(guiData, 'mix', 0., 1.).step(0.001);
    gui.add(guiData, 'mix1', 0., 1.).step(0.001);
    gui.add(guiData, 'mix2', 0., 1.).step(0.001);
    gui.add(guiData, 'sliderX', -1., 1.).step(0.001);
    gui.add(guiData, 'sliderY', -1., 1.).step(0.001);

};

addGuiControls()

let vertex = `varying vec2 texCoordVarying;
   void main() {
     texCoordVarying = (position.xy +1.)*0.5;
     gl_Position =   projectionMatrix *
               modelViewMatrix *
               vec4(position,1.0);
 }`

let finalFrag =` varying vec2 texCoordVarying;
  uniform sampler2D channel0; // Webcam input
  uniform sampler2D channel1; // Backbuffer input
  uniform sampler2D channel2; //BB 1
   uniform sampler2D channel3; //BB 2

  uniform float mix;
  uniform float mix1;
  uniform float mix2;

 uniform float sliderX;
  uniform float sliderY;
  void main() {
    vec4 color;
    vec4 webcam = texture2D(channel0,texCoordVarying);
    vec4 prevText = texture2D(channel1,texCoordVarying+vec2(sliderX, sliderY));
    color = webcam*mix+prevText*(1.-mix);
    vec4 prevText1 = texture2D(channel2,texCoordVarying+vec2(sliderX, sliderY));
    color = color*(1.-mix1)+prevText1*(mix1);
    vec4 prevText2 = texture2D(channel3,texCoordVarying+vec2(sliderX, sliderY));
    color = color*(1.-mix2)+prevText2*(mix2);

    gl_FragColor = color;
  }`

let copyFrag =` varying vec2 texCoordVarying;
  uniform sampler2D channel0; // Main texture
  void main() {
    vec4 inText = texture2D(channel0,texCoordVarying);
    gl_FragColor = inText;
  }`

let webcamTexture, video;
function initWebcamCapture(){
video = document.createElement('video');
video.autoplay="";
video.style="display:none";
video.id="feedCam";

if ( navigator.mediaDevices && navigator.mediaDevices.getUserMedia && video) {
        var constraints = { video: { width: 1280, height: 720, facingMode: 'user' } };


        navigator.mediaDevices.getUserMedia( constraints ).then( function ( stream ) {
            video.srcObject = stream;
            video.play();
        } ).catch( function ( error ) {
            console.error( 'Unable to access the camera/webcam.', error );

        } );

    } else {
        console.error( 'MediaDevices interface not available.' );
    }
    window.video = document.getElementById('video');

    webcamTexture = new THREE.VideoTexture(video);
    webcamTexture.minFilter = THREE.LinearFilter;
    webcamTexture.magFilter = THREE.LinearFilter;
    webcamTexture.needsUpdate= true;
 }


var  camera, renderer,scene;
function setupMainScene(){
    scene = new THREE.Scene();
    camera = new THREE.Camera();
    renderer = new THREE.WebGLRenderer({ canvas: canvas, preserveDrawingBuffer: true  });

    const DPR = (window.devicePixelRatio) ? window.devicePixelRatio : 1;
    renderer.setPixelRatio(DPR);
    renderer.setSize(w,h);

    document.body.appendChild(renderer.domElement);
}
var bufferScene, textureA, textureB;
function setupBufferScene() {
    bufferScene = new THREE.Scene();
    textureA = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearMipMapLinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType});

    textureB = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearMipMapLinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType} );

    textureC = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearMipMapLinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType} );

    textureD = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearMipMapLinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType} );

}



var finalMaterial,quad,geom;
function initMainScene(){
  finalMaterial = new THREE.ShaderMaterial({
      uniforms : {
          channel0: { type : 't', value : webcamTexture },
          channel1: { type : 't', value : textureA.texture },
          channel2: { type : 't', value : textureB.texture },
          channel3: { type : 't', value : textureC.texture },
          mix: {value: 0.5},
          mix1: {value: 0.},
          mix2: {value: 0.},
          sliderX: {value: 0.001},
          sliderY: {value: 0.001}

      },
      vertexShader: vertex,
      fragmentShader: finalFrag
});
    geom = new THREE.PlaneBufferGeometry( window.innerWidth, window.innerHeight);
    quad = new THREE.Mesh( geom, finalMaterial );
    scene.add(quad);
}



var plane, bufferObject, bufferMaterial;
function initBufferScene(){
    bufferMaterial = new THREE.ShaderMaterial( {
    uniforms: {
        channel0: { type: "t", value: textureA.texture },
        resolution : { type : 'v2', value : new THREE.Vector2( window.innerWidth, window.innerHeight) },
    },
        vertexShader: vertex,
        fragmentShader:copyFrag
    });

    plane = new THREE.PlaneBufferGeometry( window.innerWidth, window.innerHeight);
    bufferObject = new THREE.Mesh( plane, bufferMaterial );
    bufferScene.add(bufferObject);
}



let counter= 0;
window.savebuffer = 0.;
window.savebuffer1 = 0.;
window.savebuffer2 = 0.;
window.slider = 0.5;
window.slider2 = 0.001

function render() {
    requestAnimationFrame(render);

    if(guiData.savebuffer){
        console.log("hi")
        renderer.setRenderTarget(textureA);
        renderer.render(scene, camera);

        renderer.setRenderTarget(null);
        renderer.clear();

        renderer.setRenderTarget(textureB);
        renderer.render(bufferScene, camera);

        renderer.setRenderTarget(null);
        renderer.clear();

       quad.material.uniforms.channel1.value = textureB.texture;
       bufferMaterial.uniforms.channel0.value = textureA.texture;
        console.log("clean")
       guiData.savebuffer = false;
    }

    if(guiData.savebuffer1){
        renderer.setRenderTarget(textureA);
        renderer.render(scene, camera);

        renderer.setRenderTarget(null);
        renderer.clear();

        renderer.setRenderTarget(textureC);
        renderer.render(bufferScene, camera);

        renderer.setRenderTarget(null);
        renderer.clear();

        quad.material.uniforms.channel2.value = textureC.texture;
        bufferMaterial.uniforms.channel0.value = textureA.texture;
        guiData.savebuffer1 = false;
    }

    if(guiData.savebuffer2){
        renderer.setRenderTarget(textureA);
        renderer.render(scene, camera);

        renderer.setRenderTarget(null);
        renderer.clear();

        renderer.setRenderTarget(textureD);
        renderer.render(bufferScene, camera);

        renderer.setRenderTarget(null);
        renderer.clear();

        quad.material.uniforms.channel2.value = textureD.texture;
        bufferMaterial.uniforms.channel0.value = textureA.texture;
        guiData.savebuffer2 = false;
    }




    quad.material.uniforms.mix.value = guiData.mix;
    quad.material.uniforms.mix1.value = guiData.mix1;
    quad.material.uniforms.mix2.value = guiData.mix2;
    quad.material.uniforms.sliderX.value = guiData.sliderX;
    quad.material.uniforms.sliderY.value = guiData.sliderY;

    counter ++;
    renderer.render(scene, camera);
}

document.addEventListener("keydown", onDocumentKeyDown, false);
function onDocumentKeyDown(event) {
    var keyCode = event.which;
    if (keyCode == 49) {
        guiData.savebuffer = true;
        console.log("received event",guiData);
    } else if (keyCode == 50) {
        guiData.savebuffer1 = true;
    } else if (keyCode == 51) {
        guiData.savebuffer2 = true;
    }
};



initWebcamCapture()
setupMainScene();
setupBufferScene();
initBufferScene();
initMainScene();

render();
