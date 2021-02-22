class LiteRay
{
    private _points : Array<Point2> = new Array<Point2>();
    public get points() : Array<Point2> { return this._points; }
    public set points(value : Array<Point2>) { this._points = value; }
    
    public color: string;
    public speed: number;
    public alive: boolean;

    // player controls
    up: boolean; down: boolean; left: boolean; right: boolean;
    action: boolean;

    constructor(color: string)
    {
        this.color = color;
        this.speed = 1;

        this.up = false;
        this.down = false;
        this.left = false;
        this.right = false;
        this.action = false;

        this.alive = false;
    }

    getLastPoint(): Point2
    {
        if (!this._points || this._points.length == 0)
        return new Point2(-Infinity, -Infinity);

        // get last point
        const nbPoints = this._points.length;
        const pointLast = this._points[nbPoints - 1];
        return pointLast;
    }

    addPoint(x: number, y: number): void
    {
        this._points.push(new Point2(x, y));
    }

    getNextPoint(): Point2
    {
        if (!this._points || this._points.length <= 1)
            return new Point2(-Infinity, -Infinity);

        const {dirx, diry}: {dirx: number, diry: number} = this.direction();
        if (dirx == -Infinity || diry == -Infinity)
            return new Point2(-Infinity, -Infinity);

        // get last point
        const pointLast = this.getLastPoint();

        const x: number = pointLast.x + this.speed*dirx;
        const y: number = pointLast.y + this.speed*diry;
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

    direction(): {dirx: number, diry: number}
    {
        if (!this._points || this._points.length <= 1)
            return {dirx: -Infinity, diry: -Infinity};

        // get last segment
        const nbPoints = this._points.length;
        const pointLast = this._points[nbPoints - 1];
        const pointLastPrev = this._points[nbPoints - 2];

        // compute unit direction vector
        const dx: number = pointLast.x - pointLastPrev.x;
        const dy: number = pointLast.y - pointLastPrev.y;

        const dirx: number = Math.sign(dx);
        const diry: number = Math.sign(dy);
        return {dirx: dirx, diry: diry};
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
        let hasHole: boolean = false;
        for (let i = 1; i < nbPoints; i++)
        {
            const pointCur: Point2 = this._points[i];
            if (pointCur.x === Infinity || pointCur.y === Infinity
             || pointCur.x === null || pointCur.y === null) // hole
            {
                hasHole = true;
                continue;
            }

            if (hasHole)
            {
                ctx.moveTo(pointCur.x, pointCur.y);
                hasHole = false;
            }
            else
                ctx.lineTo(pointCur.x, pointCur.y);
        }
        ctx.stroke();
        ctx.closePath();
    }

    keyControl()
    {
        const {dirx, diry}: {dirx: number, diry: number} = this.direction();

        // get last segment
        const nbPoints = this._points.length;
        const pointLast = this._points[nbPoints - 1];


        if(this.up && diry == 0)
            this.addPoint(pointLast.x, pointLast.y - this.speed);
        else if(this.down && diry == 0)
            this.addPoint(pointLast.x, pointLast.y + this.speed);
        else if(this.left && dirx == 0)
            this.addPoint(pointLast.x - this.speed, pointLast.y);
            else if(this.right && dirx == 0)
            this.addPoint(pointLast.x + this.speed, pointLast.y);
    }
}