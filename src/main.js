const canvas = document.getElementById("canvas");

function bindEventListeners() {
	window.onresize = resizeCanvas;
    ohMyBuffer.bindEventListeners();

	resizeCanvas();
}

function resizeCanvas() {
	canvas.style.width = '100%';
	canvas.style.height= '100%';

	canvas.width  = canvas.offsetWidth;
	canvas.height = canvas.offsetHeight;

    ohMyBuffer.onWindowResize();
}


let webcamTexture, video;
function initWebcamCapture(){
    video = document.createElement('video');
    video.autoplay="";
    video.style="display:none";
    video.id="feedCam";
     console.log(video)
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

function render() {
    requestAnimationFrame(render);
    ohMyBuffer.update();
}


/** Preload Functionalities **/
initWebcamCapture();

/** Initialize  App **/
const ohMyBuffer = new OhMyBufferApp(canvas, webcamTexture);
bindEventListeners();

/** Update  App **/
render()
