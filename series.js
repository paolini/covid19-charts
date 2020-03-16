class Series {
    constructor(data_x, data_y, label) {
        this.label = label;
        this.data_x = data_x;
        this.data_y = data_y;
    }

    compute_lr() {
        this.lr = linearRegression(this.data_y.map(Math.log), this.data_x.map(date_to_days));
        this.offset = this.lr.q/this.lr.m;
    }

    offset_relative_to_series(series) {
        var last = this.data_y.length-1;
        var last2 = series.data_y.length-1;
        if (series.data_y[last2] > this.data_y[last]) {
            var i;
            for (i=series.data_y.length-1;i>=0 && series.data_y[i] > this.data_y[last];i--) {}
            return i-last;
        } else {
            var i;
            for (i=last;i>=0 && series.data_y[last2] < this.data_y[i];i--) {}
            return last-i;
        }
    }
}

// https://stackoverflow.com/questions/6195335/linear-regression-in-javascript
function linearRegression(data_y, data_x){
    var n = 0;
    var x = 0;
    var y = 0;
    var xy = 0;
    var xx = 0;
    var yy = 0;

    for (var i = 0; i < data_y.length; i++) {
        var sx = data_x[i];
        var sy = data_y[i];
        if (isFinite(sx) && isFinite(sy)) {
            x += sx;
            y += sy;
            xy += sx*sy;
            xx += sx*sx;
            yy += sy*sy;
            n ++;
            }
    } 

    var m = (n * xy - x * y) / (n*xx - x * x);
    return {
        m: m,
        q: (y - m * x)/n,
        r2: Math.pow((n*xy - x*y)/Math.sqrt((n*xx-x*x)*(n*yy-y*y)),2)
    }
}
