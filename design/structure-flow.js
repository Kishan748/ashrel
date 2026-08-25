/* <structure-flow> — three.js particle field background.
 * Ported from MengTo/threeui (MIT) src/shaders/structure-flow/structureFlowRenderer.ts,
 * recoloured for the Ashrel palette. Requires global THREE (loaded via <script> in <helmet>).
 *
 * Attributes: speed, point-size, opacity, color, count, radius, mask-start, mask-solid
 */
(function () {
  if (customElements.get('structure-flow')) return;

  class StructureFlow extends HTMLElement {
    connectedCallback() {
      if (this._built) return;
      this._built = true;

      const canvas = document.createElement('canvas');
      Object.assign(canvas.style, { width: '100%', height: '100%', display: 'block' });
      this.appendChild(canvas);
      this._canvas = canvas;

      if (typeof THREE === 'undefined') {
        this._waitForThree();
        return;
      }
      this._start();
    }

    _waitForThree() {
      let tries = 0;
      const poll = () => {
        if (typeof THREE !== 'undefined') return this._start();
        if (tries++ > 200) return;
        setTimeout(poll, 50);
      };
      poll();
    }

    _start() {
      const opts = {
        speed: parseFloat(this.getAttribute('speed') || '1'),
        pointSize: parseFloat(this.getAttribute('point-size') || '0.085'),
        opacity: parseFloat(this.getAttribute('opacity') || '0.42'),
        color: this.getAttribute('color') || '#8FDCF7',
        blend: this.getAttribute('blend') || 'additive',
        count: parseInt(this.getAttribute('count') || '14000', 10),
        radius: parseFloat(this.getAttribute('radius') || '25')
      };

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
      camera.position.z = 30;
      camera.position.y = 5;

      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas: this._canvas, alpha: true, antialias: true });
      } catch (e) {
        return; // no WebGL: the section's own background stands alone
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      const positions = new Float32Array(opts.count * 3);
      for (let i = 0; i < opts.count; i++) {
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(Math.random() * 0.8 + 0.2);
        positions[i * 3] = opts.radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = opts.radius * Math.cos(phi) - 20;
        positions[i * 3 + 2] = opts.radius * Math.sin(phi) * Math.sin(theta);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const material = new THREE.PointsMaterial({
        size: opts.pointSize,
        color: new THREE.Color(opts.color),
        transparent: true,
        opacity: opts.opacity,
        blending: opts.blend === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending,
        depthWrite: false
      });
      const particles = new THREE.Points(geometry, material);
      scene.add(particles);

      const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let frame = 0;
      let visible = true;

      const draw = (animate) => {
        if (animate && !still) {
          particles.rotation.y += 0.0008 * opts.speed;
          particles.rotation.z += 0.0002 * opts.speed;
        }
        renderer.render(scene, camera);
      };

      const resize = () => {
        const r = this.getBoundingClientRect();
        const w = Math.max(1, r.width);
        const h = Math.max(1, r.height);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        draw(false);
      };

      const tick = () => {
        draw(true);
        frame = visible && !document.hidden ? requestAnimationFrame(tick) : 0;
      };

      this._ro = new ResizeObserver(resize);
      this._ro.observe(this);
      this._io = new IntersectionObserver(([entry]) => {
        visible = entry ? entry.isIntersecting : true;
        if (visible && !frame && !still) frame = requestAnimationFrame(tick);
        if (!visible && frame) { cancelAnimationFrame(frame); frame = 0; }
      });
      this._io.observe(this);

      resize();
      if (still) draw(false);
      else frame = requestAnimationFrame(tick);

      this._cleanup = () => {
        if (frame) cancelAnimationFrame(frame);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      };
    }

    disconnectedCallback() {
      if (this._ro) this._ro.disconnect();
      if (this._io) this._io.disconnect();
      if (this._cleanup) this._cleanup();
      this._built = false;
      this._cleanup = null;
    }
  }

  customElements.define('structure-flow', StructureFlow);
})();
