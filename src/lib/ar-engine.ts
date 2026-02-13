/**
 * AR Engine - WebXR + Three.js
 * Manages the full AR pipeline: session, hit-test, anchoring, model loading, manipulation.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ---- Types ----
export type ARState = 'CHECKING' | 'PERMISSION' | 'SCANNING' | 'READY' | 'PLACED' | 'FALLBACK' | 'ERROR';

export interface AREngineCallbacks {
    onStateChange: (state: ARState) => void;
    onTrackingStatus: (quality: 'good' | 'weak' | 'lost') => void;
    onError: (message: string) => void;
    onProgress: (percent: number) => void;
}

// ---- Capability Detection ----
export async function checkARCapability(): Promise<{ webxr: boolean; sceneViewer: boolean; quickLook: boolean }> {
    const webxr = typeof navigator !== 'undefined'
        && 'xr' in navigator
        && typeof (navigator as any).xr?.isSessionSupported === 'function'
        && await (navigator as any).xr.isSessionSupported('immersive-ar').catch(() => false);

    const isAndroid = /android/i.test(navigator.userAgent);
    const isIOS = /iP(hone|ad|od)/i.test(navigator.userAgent);

    return {
        webxr: !!webxr,
        sceneViewer: isAndroid,
        quickLook: isIOS,
    };
}

// ---- AR Engine Class ----
export class AREngine {
    // Three.js
    private renderer!: THREE.WebGLRenderer;
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private model: THREE.Group | null = null;
    private reticle!: THREE.Mesh;
    private loader = new GLTFLoader();

    // WebXR
    private session: XRSession | null = null;
    private refSpace: XRReferenceSpace | null = null;
    private hitTestSource: XRHitTestSource | null = null;
    private anchor: XRAnchor | null = null;

    // State
    private state: ARState = 'CHECKING';
    private callbacks: AREngineCallbacks;
    private container: HTMLDivElement;
    private modelUrl: string;
    private modelScale: number;
    private hitTestReady = false;
    private placed = false;
    private animationId: number | null = null;

    // Manipulation
    private isDragging = false;
    private lastTouchX = 0;
    private lastTouchY = 0;
    private initialPinchDist = 0;
    private initialRotation = 0;

    // Smoothing
    private reticleTarget = new THREE.Matrix4();
    private reticleSmooth = new THREE.Matrix4();
    private smoothFactor = 0.15;

    constructor(
        container: HTMLDivElement,
        modelUrl: string,
        callbacks: AREngineCallbacks,
        modelScale = 0.25 // ~25cm plate diameter
    ) {
        this.container = container;
        this.modelUrl = modelUrl;
        this.callbacks = callbacks;
        this.modelScale = modelScale;
    }

    // ---- Public API ----

    async start(): Promise<void> {
        this.setState('CHECKING');

        const caps = await checkARCapability();
        if (!caps.webxr) {
            this.setState('FALLBACK');
            return;
        }

        this.setState('PERMISSION');
    }

    async requestSession(): Promise<boolean> {
        try {
            this.initThree();
            await this.loadModel();

            const xr = (navigator as any).xr as XRSystem;
            this.session = await xr.requestSession('immersive-ar', {
                requiredFeatures: ['hit-test', 'local-floor'],
                optionalFeatures: ['anchors', 'dom-overlay', 'light-estimation'],
                domOverlay: { root: this.container },
            });

            this.session.addEventListener('end', () => this.cleanup());

            await this.renderer.xr.setSession(this.session);
            this.refSpace = await this.session.requestReferenceSpace('local-floor');

            // Request hit-test source
            const viewerSpace = await this.session.requestReferenceSpace('viewer');
            this.hitTestSource = await (this.session as any).requestHitTestSource({ space: viewerSpace }) as XRHitTestSource;
            this.hitTestReady = true;

            this.setState('SCANNING');
            this.renderer.setAnimationLoop(this.onFrame.bind(this));
            return true;
        } catch (err: any) {
            if (err.name === 'NotAllowedError') {
                this.callbacks.onError('camera_denied');
                return false;
            }
            this.callbacks.onError(err.message || 'unknown');
            this.setState('FALLBACK');
            return false;
        }
    }

    placeObject(): void {
        if (!this.model || this.placed) return;

        // Place at current reticle position
        const pos = new THREE.Vector3();
        const quat = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        this.reticleSmooth.decompose(pos, quat, scale);

        this.model.position.copy(pos);
        this.model.quaternion.copy(quat);
        this.model.visible = true;
        this.reticle.visible = false;
        this.placed = true;

        // Try to create XR anchor for stability
        this.tryCreateAnchor(pos, quat);

        this.setState('PLACED');
    }

    resetPlacement(): void {
        if (this.anchor) {
            this.anchor.delete();
            this.anchor = null;
        }
        this.placed = false;
        if (this.model) {
            this.model.visible = false;
        }
        this.reticle.visible = true;
        this.setState('SCANNING');
    }

    recenter(): void {
        if (!this.model || !this.placed) return;
        // Move model back to current reticle target position
        const pos = new THREE.Vector3();
        const quat = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        this.reticleTarget.decompose(pos, quat, scale);
        this.model.position.copy(pos);
    }

    async stop(): Promise<void> {
        if (this.session) {
            await this.session.end().catch(() => { });
        }
        this.cleanup();
    }

    getCanvas(): HTMLCanvasElement | null {
        return this.renderer?.domElement ?? null;
    }

    // ---- Touch Manipulation ----

    handleTouchStart(e: TouchEvent): void {
        if (!this.placed || !this.model) return;
        e.preventDefault();

        if (e.touches.length === 1) {
            this.isDragging = true;
            this.lastTouchX = e.touches[0].clientX;
            this.lastTouchY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            this.isDragging = false;
            this.initialPinchDist = this.getTouchDistance(e.touches);
            this.initialRotation = this.getTouchAngle(e.touches);
        }
    }

    handleTouchMove(e: TouchEvent): void {
        if (!this.placed || !this.model) return;
        e.preventDefault();

        if (e.touches.length === 1 && this.isDragging) {
            const dx = (e.touches[0].clientX - this.lastTouchX) * 0.002;
            const dz = (e.touches[0].clientY - this.lastTouchY) * 0.002;
            this.model.position.x += dx;
            this.model.position.z += dz;
            this.lastTouchX = e.touches[0].clientX;
            this.lastTouchY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            // Pinch to scale
            const dist = this.getTouchDistance(e.touches);
            const scaleFactor = dist / this.initialPinchDist;
            const newScale = Math.max(0.1, Math.min(3, this.model.scale.x * scaleFactor));
            this.model.scale.setScalar(newScale);
            this.initialPinchDist = dist;

            // Two-finger rotate
            const angle = this.getTouchAngle(e.touches);
            this.model.rotation.y += (angle - this.initialRotation);
            this.initialRotation = angle;
        }
    }

    handleTouchEnd(_e: TouchEvent): void {
        this.isDragging = false;
    }

    // ---- Private Methods ----

    private initThree(): void {
        this.renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 30);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(1, 3, 2);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(1024, 1024);
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 10;
        this.scene.add(dirLight);

        // Ground shadow plane
        const shadowPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            new THREE.ShadowMaterial({ opacity: 0.3 })
        );
        shadowPlane.rotateX(-Math.PI / 2);
        shadowPlane.receiveShadow = true;
        this.scene.add(shadowPlane);

        // Reticle
        const ringGeom = new THREE.RingGeometry(0.08, 0.1, 32);
        ringGeom.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
        });
        this.reticle = new THREE.Mesh(ringGeom, ringMat);
        this.reticle.visible = false;
        this.reticle.matrixAutoUpdate = false;
        this.scene.add(this.reticle);
    }

    private async loadModel(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.loader.load(
                this.modelUrl,
                (gltf) => {
                    this.model = gltf.scene;
                    this.model.scale.setScalar(this.modelScale);
                    this.model.visible = false;

                    // Enable shadows on all meshes
                    this.model.traverse((child) => {
                        if ((child as THREE.Mesh).isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });

                    this.scene.add(this.model);
                    this.callbacks.onProgress(100);
                    resolve();
                },
                (progress) => {
                    if (progress.total > 0) {
                        this.callbacks.onProgress(Math.round((progress.loaded / progress.total) * 100));
                    }
                },
                (error) => {
                    reject(error);
                }
            );
        });
    }

    private onFrame(_time: DOMHighResTimeStamp, frame?: XRFrame): void {
        if (!frame || !this.refSpace || !this.hitTestSource) return;

        this.renderer.render(this.scene, this.camera);

        if (this.placed) {
            // Update anchor position if available
            if (this.anchor && (frame as any).trackedAnchors) {
                const anchorPose = frame.getPose((this.anchor as any).anchorSpace, this.refSpace);
                if (anchorPose && this.model) {
                    this.model.position.set(
                        anchorPose.transform.position.x,
                        anchorPose.transform.position.y,
                        anchorPose.transform.position.z
                    );
                    this.model.quaternion.set(
                        anchorPose.transform.orientation.x,
                        anchorPose.transform.orientation.y,
                        anchorPose.transform.orientation.z,
                        anchorPose.transform.orientation.w
                    );
                }
            }
            return;
        }

        // Hit-test for reticle placement
        const results = frame.getHitTestResults(this.hitTestSource);
        if (results.length > 0) {
            const hit = results[0];
            const pose = hit.getPose(this.refSpace);
            if (pose) {
                this.reticleTarget.fromArray(pose.transform.matrix);

                // Smooth interpolation
                this.lerpMatrix(this.reticleSmooth, this.reticleTarget, this.smoothFactor);
                this.reticle.matrix.copy(this.reticleSmooth);
                this.reticle.visible = true;

                if (this.state === 'SCANNING') {
                    this.setState('READY');
                }
                this.callbacks.onTrackingStatus('good');
            }
        } else {
            this.reticle.visible = false;
            if (this.state === 'READY') {
                this.setState('SCANNING');
            }
            this.callbacks.onTrackingStatus(this.state === 'SCANNING' ? 'weak' : 'good');
        }
    }

    private async tryCreateAnchor(position: THREE.Vector3, quaternion: THREE.Quaternion): Promise<void> {
        if (!this.session || !this.refSpace || !('createAnchor' in (this.session as any))) return;

        try {
            const anchorPose = new XRRigidTransform(
                { x: position.x, y: position.y, z: position.z, w: 1 },
                { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w }
            );
            this.anchor = await (this.session as any).createAnchor(anchorPose, this.refSpace);
        } catch {
            // Anchors not supported, model stays at placed position (still works, less stable)
        }
    }

    private lerpMatrix(current: THREE.Matrix4, target: THREE.Matrix4, alpha: number): void {
        const cp = new THREE.Vector3(), cq = new THREE.Quaternion(), cs = new THREE.Vector3();
        const tp = new THREE.Vector3(), tq = new THREE.Quaternion(), ts = new THREE.Vector3();
        current.decompose(cp, cq, cs);
        target.decompose(tp, tq, ts);

        cp.lerp(tp, alpha);
        cq.slerp(tq, alpha);
        cs.lerp(ts, alpha);
        current.compose(cp, cq, cs);
    }

    private getTouchDistance(touches: TouchList): number {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    private getTouchAngle(touches: TouchList): number {
        return Math.atan2(
            touches[1].clientY - touches[0].clientY,
            touches[1].clientX - touches[0].clientX
        );
    }

    private setState(state: ARState): void {
        this.state = state;
        this.callbacks.onStateChange(state);
    }

    private cleanup(): void {
        if (this.animationId != null) cancelAnimationFrame(this.animationId);
        this.renderer?.setAnimationLoop(null);
        this.hitTestSource = null;
        this.session = null;
        this.anchor = null;
        this.placed = false;
        this.renderer?.dispose();
    }
}
