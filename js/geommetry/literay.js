"use strict";
class LiteRay {
    constructor(color) {
        this._points = new Array();
        this.color = color;
        this.speed = 1;
        this.up = false;
        this.down = false;
        this.left = false;
        this.right = false;
        this.action = false;
        this.alive = false;
    }
    get points() { return this._points; }
    set points(value) { this._points = value; }
    getLastPoint() {
        if (!this._points || this._points.length == 0)
            return new Point2(-Infinity, -Infinity);
        // get last point
        const nbPoints = this._points.length;
        const pointLast = this._points[nbPoints - 1];
        return pointLast;
    }
    addPoint(x, y) {
        this._points.push(new Point2(x, y));
    }
    getNextPoint() {
        if (!this._points || this._points.length <= 1)
            return new Point2(-Infinity, -Infinity);
        const { dirx, diry } = this.direction();
        if (dirx == -Infinity || diry == -Infinity)
            return new Point2(-Infinity, -Infinity);
        // get last point
        const pointLast = this.getLastPoint();
        const x = pointLast.x + this.speed * dirx;
        const y = pointLast.y + this.speed * diry;
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
    reset() {
        this.points = new Array();
    }
    direction() {
        if (!this._points || this._points.length <= 1)
            return { dirx: -Infinity, diry: -Infinity };
        // get last segment
        const nbPoints = this._points.length;
        const pointLast = this._points[nbPoints - 1];
        const pointLastPrev = this._points[nbPoints - 2];
        // compute unit direction vector
        const dx = pointLast.x - pointLastPrev.x;
        const dy = pointLast.y - pointLastPrev.y;
        const dirx = Math.sign(dx);
        const diry = Math.sign(dy);
        return { dirx: dirx, diry: diry };
    }
    draw(ctx) {
        if (!this._points || this._points.length == 0)
            return;
        const nbPoints = this._points.length;
        // draw segments
        ctx.beginPath();
        ctx.strokeStyle = this.color;
        ctx.moveTo(this._points[0].x, this._points[0].y); // first point
        let hasHole = false;
        for (let i = 1; i < nbPoints; i++) {
            const pointCur = this._points[i];
            if (pointCur.x === Infinity || pointCur.y === Infinity
                || pointCur.x === null || pointCur.y === null) // hole
             {
                hasHole = true;
                continue;
            }
            if (hasHole) {
                ctx.moveTo(pointCur.x, pointCur.y);
                hasHole = false;
            }
            else
                ctx.lineTo(pointCur.x, pointCur.y);
        }
        ctx.stroke();
        ctx.closePath();
    }
    keyControl() {
        const { dirx, diry } = this.direction();
        // get last segment
        const nbPoints = this._points.length;
        const pointLast = this._points[nbPoints - 1];
        if (this.up && diry == 0)
            this.addPoint(pointLast.x, pointLast.y - this.speed);
        else if (this.down && diry == 0)
            this.addPoint(pointLast.x, pointLast.y + this.speed);
        else if (this.left && dirx == 0)
            this.addPoint(pointLast.x - this.speed, pointLast.y);
        else if (this.right && dirx == 0)
            this.addPoint(pointLast.x + this.speed, pointLast.y);
    }
}
//# sourceMappingURL=literay.js.map