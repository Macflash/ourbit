export interface Point {
  x: number;
  y: number;
}

export class Vector2 {
  static From(p: Vector2 | Point) {
    return new Vector2(p.x, p.y);
  }

  static FromAngle(r: number) {
    return new Vector2(Math.cos(r), Math.sin(r));
  }

  static DirBetween(start: Vector2 | Point, end: Vector2 | Point): Vector2 {
    return Vector2.From(end).minus(start);
  }

  constructor(readonly x: number, readonly y: number) {}

  get magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  toUnit(): Vector2 {
    return this.multiply(1 / this.magnitude);
  }

  multiply(scale: number): Vector2 {
    return new Vector2(this.x * scale, this.y * scale);
  }

  plus(that: Vector2 | Point): Vector2 {
    return new Vector2(this.x + that.x, this.y + that.y);
  }

  minus(that: Vector2 | Point): Vector2 {
    return new Vector2(this.x - that.x, this.y - that.y);
  }
}
