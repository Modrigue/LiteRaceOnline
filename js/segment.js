"use strict";
class Segment {
    constructor(x1, y1, x2, y2, color) {
        this._points = new Array(2);
        this._points[0] = new Point2(x1, y1);
        this._points[1] = new Point2(x2, y2);
        ;
        this.color = color;
    }
    get points() { return this._points; }
    set points(value) { this._points = value; }
    draw(ctx) {
        ctx.beginPath();
        ctx.strokeStyle = this.color;
        ctx.moveTo(this._points[0].x, this._points[0].y);
        ctx.lineTo(this._points[1].x, this._points[1].y);
        ctx.stroke();
        ctx.closePath();
    }
}
//# sourceMappingURL=segment.js.map