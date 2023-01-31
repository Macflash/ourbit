import "./App.css";
import { Point, Vector2 } from "./vector";

var cvs: HTMLCanvasElement;
var ctx: CanvasRenderingContext2D;

/** Background star field. */
const stars: Point[] = [];

function init(c: HTMLCanvasElement) {
  if (cvs) return;
  cvs = c;
  ctx = cvs.getContext("2d")!;
  console.log(ctx);

  for (let i = 0; i < 100; i++) {
    stars.push({
      x: Math.floor(Math.random() * cvs.width),
      y: Math.floor(Math.random() * cvs.height),
    });
  }

  GameLoop();
}

function drawCircle({
  color,
  position,
  radius,
}: {
  color?: string;
  position: Point;
  radius: number;
}) {
  ctx.beginPath();
  ctx.fillStyle = color || "grey";
  ctx.arc(position.x, position.y, radius, 0, 360);
  ctx.fill();
}

interface Body {
  name?: string;
  color?: string;

  mass: number;
  radius: number;

  position: Point;
  velocity: Point;

  /** Rotation direction of the body */
  rotation?: number;

  /**Rotation velocity */
  rv?: number;

  // We can do a full physics sim for orbital mechanics, which would be chaotic and possibly inefficient
  // OR we could track which specific bodies each body should track for gravity
  // OR we could do it based on range. This doesn't really do lagrange points though.

  // Whether this should influence other objects.
  isGravSource?: boolean;

  destroyed?: boolean;

  draw?: (body: Body) => void;
}

const EARTH: Body = {
  name: "EARTH",
  color: "blue",

  position: { x: 375, y: 375 },

  mass: 6e24,
  radius: 50,

  velocity: { x: 0, y: 0 },

  isGravSource: true,
};

const MOON: Body = {
  name: "MOON",
  color: "grey",

  position: { x: 375, y: 100 },

  mass: 7e22,
  radius: 10,

  velocity: { x: 0.3, y: 0 },

  isGravSource: true,
};

const LIL_MOON: Body = {
  name: "lil moon",
  color: "green",

  position: { x: 375, y: 250 },

  mass: 7e22,
  radius: 2,

  velocity: { x: 0.6, y: 0 },
};

const ship: Body = {
  name: "you!",
  color: "white",

  position: { x: 375, y: 600 },

  mass: 1000,
  radius: 10,

  rotation: Math.PI,
  rv: 0,

  velocity: { x: -0.5, y: 0 },

  draw: (ship: Body) => {
    const w = 20;
    ctx.save();
    ctx.fillStyle = ship.color || "white";
    // This doesn't rotate it quite right
    ctx.translate(ship.position.x, ship.position.y);
    ctx.rotate(ship.rotation || 0);
    ctx.moveTo(0.5 * w, w);

    ctx.fillRect(0, 0, w, 0.5 * w);
    ctx.fillRect(0, -0.1 * w, 0.5 * w, 0.7 * w);
    ctx.restore();
  },
};

function plotOrbit(body: Body, steps = 300, stepsize = 20) {
  const plotter = { ...body };
  ctx.strokeStyle = "yellow";
  ctx.beginPath();
  ctx.moveTo(plotter.position.x, plotter.position.y);
  for (let i = 0; i < steps; i++) {
    // Apply gravity
    for (const grav of gravSources) {
      Gravity(grav, plotter, stepsize);
    }

    // Update position
    plotter.position = Vector2.From(plotter.velocity)
      .multiply(stepsize)
      .plus(plotter.position);

    // Draw the line
    ctx.lineTo(plotter.position.x, plotter.position.y);

    // Check position
    if (
      i > 20 &&
      Vector2.DirBetween(plotter.position, body.position).magnitude < 10
    ) {
      break;
    }
  }

  ctx.stroke();
}

/**
 * Applies gravity to a satelite around a planet.
 * @returns the distance between them
 */
function Gravity(planet: Body, satelite: Body, scale = 1) {
  const gravVec = Vector2.DirBetween(satelite.position, planet.position);
  const r = gravVec.magnitude;
  const a = gravity / (r * r);
  const aVec = gravVec.toUnit().multiply(a);
  satelite.velocity = aVec.multiply(scale).plus(satelite.velocity);

  return r;
}

document.addEventListener("keydown", (ev) => {
  console.log("keydown", ev.key, ev);

  if (ev.key == "ArrowLeft") {
    ship.rv! -= 0.01;
  }
  if (ev.key == "ArrowRight") {
    ship.rv! += 0.01;
  }
  if (ev.key == "ArrowUp") {
    ship.velocity = Vector2.FromAngle(ship.rotation!)
      .multiply(0.001)
      .plus(ship.velocity);
  }
  if (ev.key == " ") {
    console.log(bodies.length);
    bodies.push({
      ...ship,
      velocity: Vector2.FromAngle(ship.rotation!).plus(ship.velocity),
      radius: 2,
      color: "red",
      draw: undefined,
    });
  }
});

const gravSources: Body[] = [EARTH];
var bodies: Body[] = [EARTH, MOON, LIL_MOON, ship];
console.log(bodies);

function WithinBounds(p: Point, center: Point, radius: number): boolean {
  return Vector2.DirBetween(p, center).magnitude <= radius;
}

const gravity = 50;

function GameLoop() {
  bodies = bodies.filter(
    (body) =>
      !body.destroyed && WithinBounds(body.position, EARTH.position, 500)
  );

  // Draw space
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, cvs.width, cvs.height);

  // TODO: Draw some stars?
  ctx.fillStyle = "white";
  for (const star of stars) {
    ctx.fillRect(star.x, star.y, 1, 1);
  }

  plotOrbit(ship);

  // Do gravity!
  for (const body of bodies) {
    // A = G/r^2
    for (const gravSource of gravSources) {
      if (body == gravSource) continue;
      const gravVec = Vector2.DirBetween(body.position, gravSource.position);
      const r = gravVec.magnitude;

      if (r <= body.radius + gravSource.radius) {
        // collision with grav source body!
        console.log("Collision!", body, gravSource);

        drawCircle({
          color: "orange",
          position: body.position,
          radius: 3 + body.radius * 2,
        });

        body.destroyed = true;
      }

      const a = gravity / (r * r);
      const aVec = gravVec.toUnit().multiply(a);
      body.velocity = aVec.plus(body.velocity);
    }
  }

  // Move the bodies!
  for (const body of bodies) {
    body.position = Vector2.From(body.velocity).plus(body.position);
    body.rotation! += body.rv!;
  }

  // Draw the bodies!
  for (const body of bodies) {
    if (body.destroyed) continue;

    if (body.draw) {
      body.draw(body);
    } else {
      drawCircle(body);
    }
  }

  // LETS DO THE TIME WARP AGAIN
  requestAnimationFrame(() => GameLoop());
}

function App() {
  const size = 750;

  return (
    <div className='App'>
      <canvas
        width={size}
        height={size}
        id='GAME_CANVAS'
        ref={(canvas) => {
          if (canvas) init(canvas);
        }}
      />
    </div>
  );
}

export default App;
