const RESTITUTION = 0.72;
const SURFACE_DRAG = 0.982;
const FIXED_STEP = 1 / 120;
const PIP_POSITIONS = [
  'top-left',
  'top-right',
  'middle-left',
  'center',
  'middle-right',
  'bottom-left',
  'bottom-right',
];

const PIP_LAYOUTS = {
  1: ['center'],
  2: ['top-left', 'bottom-right'],
  3: ['top-left', 'center', 'bottom-right'],
  4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
  6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right'],
};

export function formatDiceExpression(values, modifier, total) {
  let expression = values.map(String).join(' + ');
  if (modifier) expression += ` ${modifier > 0 ? '+' : '−'} ${Math.abs(modifier)}`;
  return `${expression} = ${total}`;
}

export function cubeOrientationForValue(value) {
  const orientations = {
    1: [0, 0],
    2: [0, -90],
    3: [-90, 0],
    4: [90, 0],
    5: [0, 90],
    6: [0, 180],
  };
  if (!orientations[value]) throw new RangeError('cubeOrientationForValue: value must be 1-6');
  return orientations[value];
}

export function settledCubeTransform(value, zRotation = 0) {
  const [rotateX, rotateY] = cubeOrientationForValue(value);
  return `rotateZ(${zRotation}deg) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
}

function setDieFace(die, value) {
  die.setAttribute('aria-label', `Rolled ${value}`);
  die.title = `Rolled ${value}`;
}

function makePippedFace(value) {
  const face = document.createElement('span');
  face.className = `die-side die-side-${value}`;
  const activePips = new Set(PIP_LAYOUTS[value]);
  PIP_POSITIONS.forEach((position) => {
    const pip = document.createElement('i');
    pip.className = `pip pip-${position}`;
    pip.hidden = !activePips.has(position);
    face.appendChild(pip);
  });
  return face;
}

function makeDie(value) {
  const die = document.createElement('span');
  die.className = 'physics-die';
  const cube = document.createElement('span');
  cube.className = 'die-cube';
  for (let faceValue = 1; faceValue <= 6; faceValue += 1) cube.appendChild(makePippedFace(faceValue));
  die.appendChild(cube);
  setDieFace(die, value);
  return die;
}

export class DiceAnimator {
  constructor(container, { onImpact } = {}) {
    this.container = container;
    this.onImpact = onImpact;
    this.frame = null;
    this.lastImpactAt = 0;
  }

  emitImpact(intensity, now) {
    if (now - this.lastImpactAt < 42) return;
    this.lastImpactAt = now;
    this.onImpact?.(Math.max(0.08, Math.min(1, intensity)));
  }

  async roll(values, sides, { modifier = 0, total, suffix = '' } = {}) {
    cancelAnimationFrame(this.frame);
    this.container.replaceChildren();
    const arena = document.createElement('div');
    arena.className = 'dice-arena';
    arena.tabIndex = 0;
    arena.setAttribute('role', 'button');
    arena.setAttribute('aria-label', 'Roll dice again');
    arena.title = 'Roll dice again';
    this.container.appendChild(arena);

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const width = this.container.clientWidth || 280;
    const requestedHeight = Math.max(230, Math.min(360, width * 0.58));
    arena.style.height = `${requestedHeight}px`;
    const tableWidth = arena.clientWidth || width;
    const height = arena.clientHeight || requestedHeight;
    const radius = Math.max(17, Math.min(25, Math.sqrt((tableWidth * height) / values.length) * 0.16));
    const states = values.map((finalValue, index) => {
      const element = makeDie(finalValue);
      element.style.setProperty('--die-size', `${radius * 2}px`);
      arena.appendChild(element);
      const launchAngle = (Math.PI * 2 * index / values.length) + (Math.random() - 0.5) * 0.75;
      const clusterRadius = Math.min(tableWidth, height) * (0.05 + (index % 3) * 0.025);
      const speed = 230 + Math.random() * 250;
      return {
        element,
        cube: element.querySelector('.die-cube'),
        finalValue,
        x: tableWidth / 2 + Math.cos(launchAngle) * clusterRadius,
        y: height / 2 + Math.sin(launchAngle) * clusterRadius,
        vx: Math.cos(launchAngle) * speed,
        vy: Math.sin(launchAngle) * speed,
        angle: Math.random() * 90,
        angularVelocity: (Math.random() - 0.5) * 620,
        tumbleX: Math.random() * 180,
        tumbleY: Math.random() * 180,
        radius,
      };
    });

    if (!reducedMotion) {
      await this.simulate(states, tableWidth, height, sides);
      await this.settle(states, tableWidth, height);
    } else {
      states.forEach((state) => {
        state.element.style.transform = `translate3d(${state.x - state.radius}px, ${state.y - state.radius}px, 0)`;
        state.cube.style.transform = settledCubeTransform(state.finalValue);
      });
    }
    states.forEach((state) => {
      setDieFace(state.element, state.finalValue);
      state.element.classList.add('is-settled');
    });

    const summary = document.createElement('span');
    summary.className = 'dice-total';
    summary.textContent = `${formatDiceExpression(values, modifier, total)}${suffix}`;
    this.container.appendChild(summary);
  }

  simulate(states, width, height, sides) {
    return new Promise((resolve) => {
      const started = performance.now();
      let previous = started;
      let accumulator = 0;
      const minimumDuration = 950;
      const maximumDuration = 2100;

      const integrate = (dt, now) => {
        const drag = SURFACE_DRAG ** (dt / FIXED_STEP);
        states.forEach((state) => {
          state.x += state.vx * dt;
          state.y += state.vy * dt;
          state.angle += state.angularVelocity * dt;
          state.tumbleX += state.vy / (state.radius * 2) * 180 * dt;
          state.tumbleY -= state.vx / (state.radius * 2) * 180 * dt;
          state.vx *= drag;
          state.vy *= drag;
          state.angularVelocity *= drag * 0.997;

          const boundaryRadius = state.radius * Math.SQRT2;
          if (state.x < boundaryRadius || state.x > width - boundaryRadius) {
            state.x = Math.max(boundaryRadius, Math.min(width - boundaryRadius, state.x));
            state.vx *= -RESTITUTION;
            state.angularVelocity *= -0.82;
            this.emitImpact(Math.abs(state.vx) / 430, now);
          }
          if (state.y < boundaryRadius || state.y > height - boundaryRadius) {
            state.y = Math.max(boundaryRadius, Math.min(height - boundaryRadius, state.y));
            state.vy *= -RESTITUTION;
            state.angularVelocity *= -0.82;
            this.emitImpact(Math.abs(state.vy) / 430, now);
          }
        });

        for (let leftIndex = 0; leftIndex < states.length; leftIndex += 1) {
          for (let rightIndex = leftIndex + 1; rightIndex < states.length; rightIndex += 1) {
            const left = states[leftIndex];
            const right = states[rightIndex];
            const dx = right.x - left.x;
            const dy = right.y - left.y;
            const distance = Math.hypot(dx, dy) || 1;
            const minimum = (left.radius + right.radius) * 1.28 + 2;
            if (distance >= minimum) continue;
            const nx = dx / distance;
            const ny = dy / distance;
            const overlap = (minimum - distance) / 2;
            left.x -= nx * overlap;
            left.y -= ny * overlap;
            right.x += nx * overlap;
            right.y += ny * overlap;
            const relativeVelocity = (right.vx - left.vx) * nx + (right.vy - left.vy) * ny;
            if (relativeVelocity < 0) {
              const impulse = -(1 + RESTITUTION) * relativeVelocity / 2;
              left.vx -= impulse * nx;
              left.vy -= impulse * ny;
              right.vx += impulse * nx;
              right.vy += impulse * ny;
              left.angularVelocity -= impulse * 0.18;
              right.angularVelocity += impulse * 0.18;
              this.emitImpact(Math.abs(relativeVelocity) / 620, now);
            }
          }
        }
      };

      const step = (now) => {
        const elapsed = now - started;
        accumulator += Math.min(0.05, (now - previous) / 1000);
        previous = now;
        while (accumulator >= FIXED_STEP) {
          integrate(FIXED_STEP, now);
          accumulator -= FIXED_STEP;
        }

        states.forEach((state) => {
          const speed = Math.hypot(state.vx, state.vy);
          const lift = Math.abs(Math.sin((state.tumbleX + state.tumbleY) * Math.PI / 180)) * Math.min(12, speed * 0.035);
          state.element.style.transform = `translate3d(${state.x - state.radius}px, ${state.y - state.radius}px, ${lift}px)`;
          state.cube.style.transform = `rotateX(${state.tumbleX}deg) rotateY(${state.tumbleY}deg) rotateZ(${state.angle}deg)`;
        });

        const sleeping = states.every((state) => Math.hypot(state.vx, state.vy) < 15 && Math.abs(state.angularVelocity) < 22);
        if (elapsed < maximumDuration && (elapsed < minimumDuration || !sleeping)) this.frame = requestAnimationFrame(step);
        else resolve();
      };
      this.frame = requestAnimationFrame(step);
    });
  }

  settle(states, width, height) {
    const animations = states.map((state) => {
      const previousPosition = state.element.style.transform;
      const previousRotation = state.cube.style.transform;
      state.x = Math.max(state.radius + 2, Math.min(width - state.radius - 2, state.x));
      state.y = Math.max(state.radius + 2, Math.min(height - state.radius - 2, state.y));
      state.angle = Math.round(state.angle / 90) * 90;
      const position = `translate3d(${state.x - state.radius}px, ${state.y - state.radius}px, 0)`;
      const [rotateX, rotateY] = cubeOrientationForValue(state.finalValue);
      const rotation = settledCubeTransform(state.finalValue, state.angle);
      state.element.style.transform = position;
      state.cube.style.transform = rotation;
      const positionAnimation = state.element.animate([
        { transform: previousPosition },
        { transform: `translate3d(${state.x - state.radius}px, ${state.y - state.radius}px, 6px)`, offset: 0.6 },
        { transform: position, offset: 1 },
      ], { duration: 260, easing: 'cubic-bezier(.2,.9,.3,1)' }).finished.catch(() => {});
      const rotationAnimation = state.cube.animate([
        { transform: previousRotation },
        { transform: `rotateZ(${state.angle + 4}deg) rotateX(${rotateX - 8}deg) rotateY(${rotateY + 6}deg) scale(1.06)`, offset: 0.6 },
        { transform: rotation, offset: 1 },
      ], { duration: 260, easing: 'cubic-bezier(.2,.9,.3,1)' }).finished.catch(() => {});
      return Promise.all([positionAnimation, rotationAnimation]);
    });
    return Promise.all(animations);
  }
}