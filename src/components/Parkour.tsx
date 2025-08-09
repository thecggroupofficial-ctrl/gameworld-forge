import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// 3D Parkour — Mobile-first controls: on-screen joystick to move, drag to look
// Desktop still supports pointer lock + mouse; mobile gets touch drag look + buttons

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const Parkour: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const winRef = useRef<HTMLDivElement | null>(null);
  const timeRef = useRef<HTMLParagraphElement | null>(null);
  const joystickRef = useRef<HTMLDivElement | null>(null);
  const joyBaseRef = useRef<HTMLDivElement | null>(null);
  const joyStickRef = useRef<HTMLDivElement | null>(null);
  const jumpBtnRef = useRef<HTMLDivElement | null>(null);

  const [isWin, setIsWin] = useState(false);

  useEffect(() => {
    // Detect touch devices
    const isTouch = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

    // Setup THREE
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current!, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444455, 0.9);
    hemi.position.set(0, 50, 0);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(5, 20, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    scene.add(dir);

    // Player
    const playerHeight = 1.8;
    const playerRadius = 0.35;
    const playerGeo = new THREE.BoxGeometry(playerRadius * 2, playerHeight, playerRadius * 2);
    const playerMat = new THREE.MeshStandardMaterial({ color: 0x1e90ff });
    const player = new THREE.Mesh(playerGeo, playerMat);
    player.castShadow = true;
    const spawn = new THREE.Vector3(0, 2, 0);
    player.position.copy(spawn);
    scene.add(player);

    // Platforms group
    const platforms = new THREE.Group();
    scene.add(platforms);

    const makePlatform = (x: number, y: number, z: number, w = 6, d = 6, color = 0x555555) => {
      const g = new THREE.BoxGeometry(w, 0.5, d);
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color }));
      m.position.set(x, y - 0.25, z);
      m.receiveShadow = true;
      platforms.add(m);
      return m;
    };

    makePlatform(0, 0, 0, 8, 8, 0x444444);
    let z = -8;
    for (let i = 0; i < 10; i++) {
      const gap = 4 + Math.random() * 3;
      z -= gap;
      const x = (Math.random() - 0.5) * 3;
      const y = i % 4 === 0 ? 0.8 : 0;
      makePlatform(x, y, z, 6 - ((i % 3) * 1.2), 6, 0x555555);
      if (Math.random() < 0.4) {
        const b = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 1.4, 1.4),
          new THREE.MeshStandardMaterial({ color: 0xaa3333 })
        );
        b.position.set(x, y + 1, z);
        b.castShadow = true;
        platforms.add(b);
      }
    }

    const endPlatform = makePlatform(0, 0, z - 6, 10, 10, 0x224422);
    void endPlatform; // not used, but kept for reference

    const gem = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.25, 16, 60),
      new THREE.MeshStandardMaterial({ emissive: 0xaaff99, emissiveIntensity: 0.9, color: 0x224422 })
    );
    gem.position.set(0, 1, z - 6);
    gem.rotation.x = Math.PI / 4;
    scene.add(gem);

    const below = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: 0x223344 })
    );
    below.rotation.x = -Math.PI / 2;
    below.position.y = -80;
    scene.add(below);

    // Movement & inputs
    const velocity = new THREE.Vector3();
    const keys: Record<string, boolean> = {};
    let onGround = false;
    const gravity = -30;
    const walkSpeed = 5.5;
    const runMultiplier = 1.9;
    const jumpPower = 10;

    let pointerLocked = false;
    let yaw = 0, pitch = 0;
    const sensitivity = 0.0028;

    // Mobile joystick state
    const joyState = { x: 0, y: 0 };

    // Helpers
    const raycaster = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);

    const checkGround = () => {
      raycaster.set(player.position.clone(), down);
      raycaster.far = 1.2;
      const hits = raycaster.intersectObjects(platforms.children, true);
      if (hits.length) {
        const h = hits[0];
        if ((h.face && (h.face as any).normal && (h.face as any).normal.y > 0.45) && h.distance <= 1.05) {
          onGround = true;
          player.position.y = Math.max(player.position.y, h.point.y + playerHeight / 2);
          velocity.y = Math.min(velocity.y, 0);
          return;
        }
      }
      onGround = false;
    };

    const resetToSpawn = () => {
      player.position.copy(spawn);
      velocity.set(0, 0, 0);
      yaw = 0; pitch = 0;
    };

    // UI handlers
    const setOverlay = (msg: string) => {
      if (overlayRef.current) overlayRef.current.textContent = msg;
    };

    // Pointer lock for desktop
    const onBodyClick = () => {
      if (!isTouch && !pointerLocked) {
        try { document.body.requestPointerLock(); } catch { /* noop */ }
      }
    };

    const onPointerLockChange = () => {
      pointerLocked = document.pointerLockElement === document.body;
      setOverlay(pointerLocked ? "Pointer locked — move mouse to look." : "Click to lock pointer.");
      document.body.style.cursor = pointerLocked ? "none" : "default";
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!pointerLocked) return;
      yaw -= e.movementX * sensitivity;
      pitch -= e.movementY * sensitivity;
      const lim = Math.PI / 2 - 0.01;
      pitch = clamp(pitch, -lim, lim);
    };

    // Keyboard
    const onKeyDown = (e: KeyboardEvent) => { keys[e.code] = true; };
    const onKeyUp = (e: KeyboardEvent) => { keys[e.code] = false; };

    // Touch joystick setup
    const joyBase = joyBaseRef.current;
    const joyStick = joyStickRef.current;
    const jumpBtn = jumpBtnRef.current;

    if (isTouch) {
      if (joystickRef.current) joystickRef.current.style.display = "block";
      if (jumpBtn) jumpBtn.style.display = "flex";
    }

    let active = false, cx = 0, cy = 0, max = 46;
    const onJoyStart = (ev: TouchEvent) => {
      if (!joyBase) return;
      active = true;
      const r = joyBase.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
      ev.preventDefault();
    };
    const onJoyMove = (ev: TouchEvent) => {
      if (!active || !joyStick) return;
      const t = ev.changedTouches[0];
      const dx = t.clientX - cx, dy = t.clientY - cy;
      const d = Math.hypot(dx, dy) || 1;
      const nx = dx / d, ny = dy / d;
      const r = Math.min(max, d);
      joyStick.style.transform = `translate(${nx * r}px, ${ny * r}px)`;
      joyState.x = nx * r / max;
      joyState.y = -ny * r / max; // forward positive
      ev.preventDefault();
    };
    const onJoyEnd = (ev: TouchEvent) => {
      active = false;
      if (joyStick) joyStick.style.transform = "translate(0,0)";
      joyState.x = 0; joyState.y = 0;
      ev.preventDefault();
    };

    const onJumpStart = (e: TouchEvent) => { keys["Space"] = true; e.preventDefault(); };
    const onJumpEnd = (e: TouchEvent) => { keys["Space"] = false; e.preventDefault(); };

    // Touch drag-to-look (outside joystick area)
    let lookActive = false, lx = 0, ly = 0;
    const isEventInJoystick = (target: EventTarget | null) => {
      const el = target as Node | null;
      return !!(joystickRef.current && el && joystickRef.current.contains(el));
    };
    const onTouchStart = (e: TouchEvent) => {
      if (!isTouch) return;
      if (isEventInJoystick(e.target)) return; // ignore joystick area
      const t = e.changedTouches[0];
      lookActive = true; lx = t.clientX; ly = t.clientY;
      e.preventDefault();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isTouch || !lookActive) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - lx; const dy = t.clientY - ly;
      lx = t.clientX; ly = t.clientY;
      yaw -= dx * sensitivity;
      pitch -= dy * sensitivity;
      const lim = Math.PI / 2 - 0.01;
      pitch = clamp(pitch, -lim, lim);
      e.preventDefault();
    };
    const onTouchEnd = () => { lookActive = false; };

    // Win UI
    let startTime = performance.now();
    const showWin = () => {
      const t = ((performance.now() - startTime) / 1000).toFixed(2);
      if (timeRef.current) timeRef.current.textContent = `Time: ${t}s`;
      setIsWin(true);
    };

    const restart = () => {
      setIsWin(false);
      resetToSpawn();
      startTime = performance.now();
    };

    // Event listeners
    document.body.addEventListener("click", onBodyClick);
    document.addEventListener("pointerlockchange", onPointerLockChange);
    document.addEventListener("mousemove", onMouseMove);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    if (joyBase) {
      joyBase.addEventListener("touchstart", onJoyStart as any, { passive: false } as any);
      joyBase.addEventListener("touchmove", onJoyMove as any, { passive: false } as any);
      joyBase.addEventListener("touchend", onJoyEnd as any, { passive: false } as any);
      joyBase.addEventListener("touchcancel", onJoyEnd as any, { passive: false } as any);
    }
    if (jumpBtn) {
      jumpBtn.addEventListener("touchstart", onJumpStart as any, { passive: false } as any);
      jumpBtn.addEventListener("touchend", onJumpEnd as any, { passive: false } as any);
      jumpBtn.addEventListener("touchcancel", onJumpEnd as any, { passive: false } as any);
    }

    document.addEventListener("touchstart", onTouchStart as any, { passive: false } as any);
    document.addEventListener("touchmove", onTouchMove as any, { passive: false } as any);
    document.addEventListener("touchend", onTouchEnd as any, { passive: true } as any);

    // Resize
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // Initial overlay text
    setOverlay(isTouch ? "Drag to look. Use joystick to move. Tap JUMP." : "Click to lock pointer, then move mouse to look.");

    // Animate loop
    const clock = new THREE.Clock();

    const animate = () => {
      const dt = Math.min(0.05, clock.getDelta());

      // Inputs: S forward, W backward (as per request)
      let forward = 0, right = 0;
      if (keys["KeyS"] || keys["ArrowDown"]) forward += 1;
      if (keys["KeyW"] || keys["ArrowUp"]) forward -= 1;
      if (keys["KeyA"] || keys["ArrowLeft"]) right -= 1;
      if (keys["KeyD"] || keys["ArrowRight"]) right += 1;

      // Joystick
      forward += joyState.y || 0;
      right += joyState.x || 0;

      const isRunning = keys["ShiftLeft"] || keys["ShiftRight"]; // desktop only
      const speed = isRunning ? walkSpeed * runMultiplier : walkSpeed;

      const mag = Math.hypot(forward, right) || 1;
      forward /= mag; right /= mag;

      const moveDir = new THREE.Vector3();
      const camYaw = yaw;
      moveDir.x = Math.sin(camYaw) * forward + Math.cos(camYaw) * right;
      moveDir.z = Math.cos(camYaw) * forward - Math.sin(camYaw) * right;

      velocity.x = moveDir.x * speed;
      velocity.z = moveDir.z * speed;

      // Gravity & jump
      checkGround();
      if (onGround) {
        if (keys["Space"]) {
          velocity.y = jumpPower; onGround = false; keys["Space"] = false; // single tap
        } else {
          velocity.y = Math.max(velocity.y, -4);
        }
      }
      velocity.y += (-gravity) > 0 ? gravity * dt : gravity * dt; // keep as provided

      // Integrate
      player.position.addScaledVector(velocity, dt);

      // Snap to platform tops if slightly inside
      raycaster.set(player.position.clone(), down);
      raycaster.far = 1.4;
      const hits = raycaster.intersectObjects(platforms.children, true);
      if (hits.length) {
        const h = hits[0];
        if (h.distance < 1.05) {
          player.position.y += (1.05 - h.distance);
          velocity.y = Math.min(0, velocity.y);
          onGround = true;
        }
      }

      // Fall detection
      if (player.position.y < -20) resetToSpawn();

      // Win detection
      if (player.position.distanceTo(gem.position) < 1.6) showWin();

      // Camera: first-person attached to head
      const headPos = player.position.clone().add(new THREE.Vector3(0, playerHeight * 0.45, 0));
      camera.position.copy(headPos);
      const e = new THREE.Euler(pitch, yaw, 0, "YXZ");
      camera.quaternion.setFromEuler(e);

      renderer.render(scene, camera);
      req = requestAnimationFrame(animate);
    };

    let req = requestAnimationFrame(animate);

    // Start pose
    camera.position.copy(spawn).add(new THREE.Vector3(0, playerHeight, 0));
    camera.lookAt(spawn);

    // Cleanup
    return () => {
      cancelAnimationFrame(req);
      window.removeEventListener("resize", onResize);
      document.body.removeEventListener("click", onBodyClick);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      if (joyBase) {
        joyBase.removeEventListener("touchstart", onJoyStart as any);
        joyBase.removeEventListener("touchmove", onJoyMove as any);
        joyBase.removeEventListener("touchend", onJoyEnd as any);
        joyBase.removeEventListener("touchcancel", onJoyEnd as any);
      }
      if (jumpBtn) {
        jumpBtn.removeEventListener("touchstart", onJumpStart as any);
        jumpBtn.removeEventListener("touchend", onJumpEnd as any);
        jumpBtn.removeEventListener("touchcancel", onJumpEnd as any);
      }
      document.removeEventListener("touchstart", onTouchStart as any);
      document.removeEventListener("touchmove", onTouchMove as any);
      document.removeEventListener("touchend", onTouchEnd as any);
      renderer.dispose();
    };
  }, []);

  // Restart handler (bridged to effect via state)
  useEffect(() => {
    if (!winRef.current) return;
    winRef.current.style.display = isWin ? "flex" : "none";
  }, [isWin]);

  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <h1 className="sr-only">3D Parkour - First Person Mobile</h1>

      {/* Overlay instructions */}
      <div
        ref={overlayRef}
        className="absolute top-2 left-0 w-full text-center z-10 text-sm px-4"
        aria-live="polite"
      >
        Click to lock pointer, then move mouse to look. Controls: S=forward, W=back, A/D=strafe, Shift+S/W=run, Space=jump.
      </div>

      {/* Win screen */}
      <div
        ref={winRef}
        className="absolute inset-0 hidden items-center justify-center bg-foreground/80 z-20 flex-col text-center p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="winTitle"
      >
        <h2 id="winTitle" className="text-2xl font-semibold mb-2">You Win!</h2>
        <p ref={timeRef} className="mb-4 text-sm opacity-90" />
        <button
          onClick={() => setIsWin(false)}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground shadow"
          aria-label="Restart"
        >
          Restart
        </button>
      </div>

      {/* Joystick */}
      <div
        id="joystick"
        ref={joystickRef}
        className="fixed left-3 bottom-3 w-[140px] h-[140px] rounded-full touch-none hidden z-30"
      >
        <div
          id="joy-base"
          ref={joyBaseRef}
          className="w-full h-full rounded-full bg-foreground/5 flex items-center justify-center"
        >
          <div
            id="joy-stick"
            ref={joyStickRef}
            className="w-14 h-14 rounded-full bg-foreground/15"
          />
        </div>
      </div>

      {/* Jump button */}
      <div
        id="jump-btn"
        ref={jumpBtnRef}
        className="fixed right-3 bottom-7 w-20 h-20 rounded-xl bg-foreground/10 hidden items-center justify-center font-semibold z-30 select-none"
        role="button"
        aria-label="Jump"
      >
        JUMP
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} className="block w-full h-full" />
    </main>
  );
};

export default Parkour;
