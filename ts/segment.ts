class Segment
{
    private _points : Array<Point2>;
    public get points() : Array<Point2> { return this._points; }
    public set points(value : Array<Point2>) { this._points = value; }

    public color: string;
    
    constructor(x1: number, y1: number, x2: number, y2: number, color: string)
    {
        this._points = new Array<Point2>(2);
        this._points[0] = new Point2(x1, y1);
        this._points[1] = new Point2(x2, y2);;

        this.color = color;
    }

    draw(ctx: CanvasRenderingContext2D): void
    {
        ctx.beginPath();
        ctx.strokeStyle = this.color;
        ctx.moveTo(this._points[0].x, this._points[0].y);
        ctx.lineTo(this._points[1].x, this._points[1].y);
        ctx.stroke();
        ctx.closePath();
    }
}