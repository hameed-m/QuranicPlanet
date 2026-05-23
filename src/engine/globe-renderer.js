import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;

export class GlobeRenderer extends EventTarget {
  constructor(canvas, continentData) {
    super();
    this.canvas = canvas;
    this.continents = continentData || [];
    
    this._countries = [];
    for (const cont of this.continents) {
      if (cont.countries) {
        for (const c of cont.countries) {
          c._continent = cont;
          this._countries.push(c);
        }
      }
    }
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#050A18');
    
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 3000);
    this.camera.position.set(0, 0, 350);
    
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 110; 
    this.controls.maxDistance = 800;
    
    this._hoveredCountry = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this._time = 0;
    this._running = false;
    this._rafId = null;
    this._lastFrameTime = 0;
    
    this.countryMeshes = [];
    this._targetPan = null; 
  }
  
  init() {
    this._createLighting();
    this._createOcean();
    this._createStars(1200);
    this._createGlobeGeometry();
    this._createLabels();
    
    this._bindEvents();
    window.addEventListener('resize', this._onResize.bind(this));
  }
  
  panTo(cx, cy, targetZoom) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const v = this._map2Dto3D(cx, cy, width, height, 250); 
    this._targetPan = v;
  }
  
  startLoop() {
    if (this._running) return;
    this._running = true;
    this._lastFrameTime = performance.now();
    this._tick();
  }

  stopLoop() {
    this._running = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }
  
  _tick() {
    if (!this._running) return;
    this._rafId = requestAnimationFrame(() => this._tick());

    const now = performance.now();
    const dt = Math.min((now - this._lastFrameTime) / 1000, 0.05);
    this._lastFrameTime = now;
    this._time += dt;

    if (this._targetPan) {
       this.camera.position.lerp(this._targetPan, 0.06);
       if (this.camera.position.distanceTo(this._targetPan) < 1) {
          this._targetPan = null;
       }
    }
    
    if (this.stars) {
      this.stars.rotation.y = this._time * 0.015;
      this.stars.rotation.x = Math.sin(this._time * 0.005) * 0.1;
    }

    if (this.labels) {
       const hw = window.innerWidth / 2;
       const hh = window.innerHeight / 2;
       const dist = this.camera.position.length();
       const hideDueToZoom = dist > 450;
       
       for (const label of this.labels) {
          const toPoint = label.center3D.clone().normalize();
          const toCam = this.camera.position.clone().normalize();
          const isVisible = toPoint.dot(toCam) > 0.15; 
          
          if (isVisible && !hideDueToZoom) {
             const proj = label.center3D.clone().project(this.camera);
             const x = (proj.x * hw) + hw;
             const y = -(proj.y * hh) + hh;
             label.el.style.left = `${x}px`;
             label.el.style.top = `${y}px`;
             
             const isHovered = this._hoveredMesh === label.mesh;
             label.el.style.opacity = isHovered ? '1' : '0.4';
             label.el.style.transform = `translate(-50%, -50%) scale(${isHovered ? 1.2 : 1})`;
             label.el.style.zIndex = isHovered ? '10' : '1';
             label.el.style.display = 'block';
          } else {
             label.el.style.display = 'none';
          }
       }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
  
  _createLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);
    
    const sun = new THREE.DirectionalLight(0xffeedd, 1.2);
    sun.position.set(500, 300, 500);
    this.scene.add(sun);
    
    const blueLight = new THREE.DirectionalLight(0x4466ff, 1.0);
    blueLight.position.set(-500, -300, -500);
    this.scene.add(blueLight);
  }
  
  _createOcean() {
    // Ocean radius 95 to prevent flat triangulated country planes from clipping
    const oceanGeo = new THREE.SphereGeometry(95, 64, 64);
    const oceanMat = new THREE.MeshStandardMaterial({ 
      color: 0x0A2463, 
      roughness: 0.1, 
      metalness: 0.2,
      emissive: 0x030a1c
    });
    this.ocean = new THREE.Mesh(oceanGeo, oceanMat);
    this.scene.add(this.ocean);

    // Subtle atmosphere glow
    const atmosGeo = new THREE.SphereGeometry(102, 64, 64);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.06,
      side: THREE.BackSide
    });
    const atmos = new THREE.Mesh(atmosGeo, atmosMat);
    this.scene.add(atmos);
  }
  
  _createStars(count) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
       const r = 400 + Math.random() * 800;
       const theta = Math.random() * TAU;
       const phi = Math.acos((Math.random() * 2) - 1);
       
       positions[i*3] = r * Math.sin(phi) * Math.cos(theta);
       positions[i*3+1] = r * Math.cos(phi);
       positions[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, sizeAttenuation: true });
    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }
  
  _map2Dto3D(x, y, width, height, radius) {
    const nx = x / width;
    const ny = y / height;
    
    // Map width to full 360 degrees, height to 180 degrees
    const lon = (nx - 0.5) * TAU; 
    const lat = -(ny - 0.5) * Math.PI; 
    
    const sx = radius * Math.cos(lat) * Math.sin(lon);
    const sy = radius * Math.sin(lat);
    const sz = radius * Math.cos(lat) * Math.cos(lon);
    return new THREE.Vector3(sx, sy, sz);
  }
  
  _createCurvedMesh(points2d, colorBase, radius, isCountry, countryData) {
     if (!points2d || points2d.length < 3) return null;
     
     let area = 0;
     for (let i = 0; i < points2d.length; i++) {
        const p1 = points2d[i];
        const p2 = points2d[(i + 1) % points2d.length];
        const x1 = Array.isArray(p1) ? p1[0] : p1.x;
        const y1 = Array.isArray(p1) ? p1[1] : p1.y;
        const x2 = Array.isArray(p2) ? p2[0] : p2.x;
        const y2 = Array.isArray(p2) ? p2[1] : p2.y;
        area += (x1 * y2 - x2 * y1);
     }
     
     let pts = [...points2d];
     if (area < 0) {
        pts.reverse();
     }
     
     const shape = new THREE.Shape();
     pts.forEach((p, i) => {
        const x = Array.isArray(p) ? p[0] : p.x;
        const y = Array.isArray(p) ? p[1] : p.y;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
     });
     
     const geometry = new THREE.ShapeGeometry(shape);
     const posAttr = geometry.attributes.position;
     const width = window.innerWidth;
     const height = window.innerHeight;
     
     for (let i=0; i<posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vy = posAttr.getY(i);
        const v3d = this._map2Dto3D(vx, vy, width, height, radius);
        posAttr.setXYZ(i, v3d.x, v3d.y, v3d.z);
     }
     geometry.computeVertexNormals();
     geometry.computeBoundingBox();
     geometry.computeBoundingSphere();
     
     const mat = new THREE.MeshStandardMaterial({
        color: colorBase,
        roughness: 0.9,
        metalness: 0.05,
        side: THREE.DoubleSide
     });
     
     const mesh = new THREE.Mesh(geometry, mat);
     if (isCountry) {
        mesh.userData = { country: countryData, baseColor: new THREE.Color(colorBase) };
     }
     return mesh;
  }
  
  _createGlobeGeometry() {
     const globeGroup = new THREE.Group();
     
     for (const cont of this.continents) {
        if (cont.outline) {
           // Continents act as a subtle glow base
           const contMesh = this._createCurvedMesh(cont.outline, cont.colorBase || '#2A1F14', 99.5, false, null);
           if (contMesh) globeGroup.add(contMesh);
        }
        
        if (cont.countries) {
           for (const c of cont.countries) {
              const baseColor = c.colorPrimary || '#3A6B35';
              const cMesh = this._createCurvedMesh(c.points, baseColor, 100, true, c);
              
              if (cMesh) {
                 // add thin edges for country borders
                 const edges = new THREE.EdgesGeometry(cMesh.geometry);
                 const lineMat = new THREE.LineBasicMaterial({ color: 0xD4AF37, transparent: true, opacity: 0.15 });
                 const border = new THREE.LineSegments(edges, lineMat);
                 cMesh.add(border);
                 
                 globeGroup.add(cMesh);
                 this.countryMeshes.push(cMesh);
              }
           }
        }
     }
     
     // Rotate to a nice starting angle (e.g., center between Meccan and Medinan)
     globeGroup.rotation.y = Math.PI / 2;
     this.scene.add(globeGroup);
  }

  _createLabels() {
    this.labelContainer = document.createElement('div');
    this.labelContainer.style.position = 'absolute';
    this.labelContainer.style.top = '0';
    this.labelContainer.style.left = '0';
    this.labelContainer.style.width = '100%';
    this.labelContainer.style.height = '100%';
    this.labelContainer.style.pointerEvents = 'none';
    this.labelContainer.style.overflow = 'hidden';
    this.canvas.parentNode.appendChild(this.labelContainer);
    
    this.labels = [];
    
    for (const mesh of this.countryMeshes) {
       const c = mesh.userData.country;
       if (!c) continue;
       
       const el = document.createElement('div');
       el.style.position = 'absolute';
       el.style.transform = 'translate(-50%, -50%)';
       el.style.textAlign = 'center';
       el.style.color = '#E0D6C2';
       el.style.textShadow = '0 2px 4px rgba(0,0,0,0.8)';
       el.style.fontFamily = 'Inter, sans-serif';
       el.style.fontSize = '12px';
       el.style.fontWeight = '500';
       el.style.transition = 'opacity 0.2s, transform 0.2s';
       
       const en = document.createElement('div');
       en.textContent = c.nameEn || '';
       const ar = document.createElement('div');
       ar.textContent = c.nameAr || '';
       ar.style.fontFamily = 'Amiri, serif';
       ar.style.fontSize = '14px';
       ar.style.color = '#D4AF37';
       
       el.appendChild(en);
       el.appendChild(ar);
       
       this.labelContainer.appendChild(el);
       
       const center3D = this._map2Dto3D(c.x, c.y, window.innerWidth, window.innerHeight, 100.5);
       
       // Adjust for initial globe rotation (globeGroup.rotation.y = Math.PI / 2)
       center3D.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);

       this.labels.push({ el, center3D, mesh });
    }
  }
  
  _bindEvents() {
    this._onMouseMove = (e) => {
       const rect = this.canvas.getBoundingClientRect();
       this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
       this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
       
       this.raycaster.setFromCamera(this.mouse, this.camera);
       
       // recursive = false to ignore LineSegments children
       const intersects = this.raycaster.intersectObjects(this.countryMeshes, false);
       let hit = null;
       if (intersects.length > 0) {
          hit = intersects[0].object;
       }
       
       if (hit !== this._hoveredMesh) {
          if (this._hoveredMesh) {
             this._hoveredMesh.material.emissive.setHex(0x000000);
             this._hoveredMesh.scale.set(1, 1, 1); // Reset pop out
             this.dispatchEvent(new CustomEvent('country-leave', { detail: { country: this._hoveredMesh.userData.country } }));
          }
          
          this._hoveredMesh = hit;
          
          if (this._hoveredMesh) {
             // Glow effect
             this._hoveredMesh.material.emissive.copy(this._hoveredMesh.userData.baseColor).multiplyScalar(0.5);
             // Slight pop out effect (scale pushes vertices radially since mesh is at origin)
             this._hoveredMesh.scale.set(1.02, 1.02, 1.02);
             
             this.dispatchEvent(new CustomEvent('country-hover', { detail: { country: this._hoveredMesh.userData.country } }));
             this.canvas.style.cursor = 'pointer';
          } else {
             this.canvas.style.cursor = 'grab';
          }
       }
    };
    
    this._onClick = (e) => {
       if (e.button !== 0) return;
       if (this._hoveredMesh) {
          this.dispatchEvent(new CustomEvent('country-click', { detail: { country: this._hoveredMesh.userData.country } }));
       }
    };
    
    this._onMouseDown = (e) => {
       if (e.button === 0) {
          this._dragStartPos = { x: e.clientX, y: e.clientY };
       }
    };
    
    this._onMouseUp = (e) => {
       if (e.button === 0) {
          const dx = e.clientX - this._dragStartPos.x;
          const dy = e.clientY - this._dragStartPos.y;
          if (Math.hypot(dx, dy) < 5) {
             this._onClick(e);
          }
       }
    };

    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    this.canvas.addEventListener('mouseup', this._onMouseUp);
  }
  
  _onResize() {
     const w = window.innerWidth;
     const h = window.innerHeight;
     this.camera.aspect = w / h;
     this.camera.updateProjectionMatrix();
     this.renderer.setSize(w, h);
  }
}
