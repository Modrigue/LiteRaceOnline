class LiteRay
{
    private _points : Array<Point2> = new Array<Point2>();
    public get points() : Array<Point2> { return this._points; }
    public set points(value : Array<Point2>) { this._points = value; }
    
    public color: string;

    constructor(color: string)
    {
        this.color = color;
    }

    addPoint(x: number, y: number): void
    {
        this._points.push(new Point2(x, y));
    }

    getNextPoint(): Point2
    {
        if (!this._points || this._points.length <= 1)
            return new Point2(-Infinity, -Infinity);

        // get last segment
        const nbPoints = this._points.length;
        const pointLast = this._points[nbPoints - 1];
        const pointLastPrev = this._points[nbPoints - 2];

        // compute unit direction vector
        const dx: number = pointLast.x - pointLastPrev.x;
        const dy: number = pointLast.y - pointLastPrev.y;

        const x: number = pointLast.x + Math.sign(dx);
        const y: number = pointLast.x + Math.sign(dy);

        return new Point2(x, y);
    }

    extendsToNextPoint(): void
    {
        if (!this._points || this._points.length == 0)
            return;

        const pointNext: Point2 = this.getNextPoint();
        if (pointNext.x === -Infinity || pointNext.y === -Infinity)
            return;

        // extend last point
        const nbPoints = this._points.length;
        this._points[nbPoints - 1].x = pointNext.x;
        this._points[nbPoints - 1].y = pointNext.y;
    }

    draw(ctx: CanvasRenderingContext2D): void
    {
        if (!this._points || this._points.length == 0)
            return;

        const nbPoints = this._points.length;
        
        // draw segments
        ctx.beginPath();
        ctx.strokeStyle = this.color;
        ctx.moveTo(this._points[0].x, this._points[0].y); // first point
        for (let i = 1; i < nbPoints; i++)
        {
            const pointCur: Point2 = this._points[i];
            ctx.lineTo(pointCur.x, pointCur.y); // 2nd to (n-1)th point(s)
        }
        ctx.stroke();
        ctx.closePath();
    }
}