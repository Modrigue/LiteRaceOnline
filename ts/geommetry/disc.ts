class Disc
{
    private _center : Point2;
    public get center() : Point2 { return this._center; }
    public set center(value : Point2) { this._center = value; }

    private _radius : number;
    public get radius() : number { return this._radius; }
    public set radius(value : number) { this._radius = value; }
    

    public color: string;
    public image: (HTMLImageElement | null);
    
    constructor(x: number, y: number, r: number, color: string)
    {
        this._center = new Point2(x, y);
        this._radius = r;

        this.color = color;
        this.image = null;
    }

    draw(ctx: CanvasRenderingContext2D): void
    {
        // display image if existing
        if (this.image !== null)
        {
            ctx.drawImage(this.image, this.center.x - this.radius, this.center.y - this.radius,
                2*this.radius, 2*this.radius);
        }
        else
        {
            ctx.beginPath();
            ctx.fillStyle = this.color;
            ctx.arc(this.center.x, this.center.y, this.radius, 0, 2*Math.PI);
            ctx.fill()
            ctx.closePath();
        }
    }
}