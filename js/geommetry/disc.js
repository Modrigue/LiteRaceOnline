"use strict";
class Disc {
    constructor(x, y, r, color) {
        this._center = new Point2(x, y);
        this._radius = r;
        this.color = color;
        this.image = null;
    }
    get center() { return this._center; }
    set center(value) { this._center = value; }
    get radius() { return this._radius; }
    set radius(value) { this._radius = value; }
    draw(ctx) {
        // display image if existing
        if (this.image !== null) {
            ctx.drawImage(this.image, this.center.x - this.radius, this.center.y - this.radius, 2 * this.radius, 2 * this.radius);
        }
        else {
            ctx.beginPath();
            ctx.fillStyle = this.color;
            ctx.arc(this.center.x, this.center.y, this.radius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.closePath();
        }
    }
}
//# sourceMappingURL=disc.js.map