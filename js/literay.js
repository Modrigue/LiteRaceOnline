"use strict";
class LiteRay {
    constructor(color) {
        this._points = new Array();
        this.color = color;
    }
    get points() { return this._points; }
    set points(value) { this._points = value; }
    addPoint(x, y) {
        this._points.push(new Point2(x, y));
    }
    getNextPoint() {
        if (!this._points || this._points.length <= 1)
            return new Point2(-Infinity, -Infinity);
        // get last segment
        const nbPoints = this._points.length;
        const pointLast = this._points[nbPoints - 1];
        const pointLastPrev = this._points[nbPoints - 2];
        // compute unit direction vector
        const dx = pointLast.x - pointLastPrev.x;
        const dy = pointLast.y - pointLastPrev.y;
        const x = pointLast.x + Math.sign(dx);
        const y = pointLast.x + Math.sign(dy);
        return new Point2(x, y);
    }
    extendsToNextPoint() {
        if (!this._points || this._points.length == 0)
            return;
        const pointNext = this.getNextPoint();
        if (pointNext.x === -Infinity || pointNext.y === -Infinity)
            return;
        // extend last point
        const nbPoints = this._points.length;
        this._points[nbPoints - 1].x = pointNext.x;
        this._points[nbPoints - 1].y = pointNext.y;
    }
    draw(ctx) {
        if (!this._points || this._points.length == 0)
            return;
        const nbPoints = this._points.length;
        // draw segments
        ctx.beginPath();
        ctx.strokeStyle = this.color;
        ctx.moveTo(this._points[0].x, this._points[0].y); // first point
        for (let i = 1; i < nbPoints; i++) {
            const pointCur = this._points[i];
            ctx.lineTo(pointCur.x, pointCur.y); // 2nd to (n-1)th point(s)
        }
        ctx.stroke();
        ctx.closePath();
    }
}
//# sourceMappingURL=literay.js.map