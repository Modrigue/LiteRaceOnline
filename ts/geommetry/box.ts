class Box
{
    private _points : Array<Point2>;
    public get points() : Array<Point2> { return this._points; }
    public set points(value : Array<Point2>) { this._points = value; }

    public color: string;
    public image: (HTMLImageElement | null);
    
    constructor(x1: number, y1: number, x2: number, y2: number, color: string)
    {
        this._points = new Array<Point2>(2);
        this._points[0] = new Point2(x1, y1);
        this._points[1] = new Point2(x2, y2);;

        this.color = color;
        this.image = null;
    }

    draw(ctx: CanvasRenderingContext2D): void
    {
        const xMin = Math.min(this._points[0].x, this._points[1].x);
        const xMax = Math.max(this._points[0].x, this._points[1].x);
        const yMin = Math.min(this._points[0].y, this._points[1].y);
        const yMax = Math.max(this._points[0].y, this._points[1].y);

        // display image if existing
        if (this.image !== null)
        {
            ctx.drawImage(this.image, xMin, yMin, xMax - xMin, yMax - yMin);
        }
        else
        {
            ctx.beginPath();
            ctx.fillStyle = this.color;
            ctx.fillRect(xMin, yMin, xMax - xMin, yMax - yMin);
            ctx.closePath();
        }
    }
}