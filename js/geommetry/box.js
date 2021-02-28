"use strict";
class Box {
    constructor(x1, y1, x2, y2, color) {
        this._points = new Array(2);
        this._points[0] = new Point2(x1, y1);
        this._points[1] = new Point2(x2, y2);
        ;
        this.color = color;
        this.image = null;
    }
    get points() { return this._points; }
    set points(value) { this._points = value; }
    draw(ctx) {
        const xMin = Math.min(this._points[0].x, this._points[1].x);
        const xMax = Math.max(this._points[0].x, this._points[1].x);
        const yMin = Math.min(this._points[0].y, this._points[1].y);
        const yMax = Math.max(this._points[0].y, this._points[1].y);
        // display image if existing
        if (this.image !== null) {
            ctx.drawImage(this.image, xMin, yMin, xMax - xMin, yMax - yMin);
        }
        else {
            ctx.beginPath();
            ctx.fillStyle = this.color;
            ctx.fillRect(xMin, yMin, xMax - xMin, yMax - yMin);
            ctx.closePath();
        }
    }
}
//# sourceMappingURL=box.js.map