class Series {
    constructor(data_x, data_y, label) {
        this.label = label;
        this.data_x = data_x;
        this.data_y = data_y;
        this.y_axis = 'count';
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

function binomial_coeff(n) {
    var coeff = [1];
    for (n--;n>0;n--) {
        var last = 0;
        var i;
        for (i=0;i<coeff.length;++i) {
            var v = coeff[i] + last;
            last = coeff[i];
            coeff[i] = v;
        }
        coeff.push(1);
    }
    return coeff;
}

function flat_coeff(n) {
    var coeff = [];
    for (;n>0;n--) {
        coeff.push(1);
    }
    return coeff;
}

function filter(data, coeff, center, logaritmic) {
    var offset = center ? Math.floor(coeff.length/2) : coeff.length-1;
    var pre_filter = function(x) {return x}; 
    var post_filter = function(x) {return x};
    if (logaritmic) {
        pre_filter = Math.log;
        post_filter = Math.exp;
    }

    var out = new Array(data.length);
    for (var i=0; i<data.length; ++i) {
        var s = 0;
        var n = 0;
        for (var j=0;j<coeff.length;j++) {
            var k = i + j - offset;
            var k_var = i + (coeff.length-1-j) - offset;
            if (k>=0 && k<data.length && k_var<data.length && k_var>=0) {
                s += pre_filter(data[k]) * coeff[j];
                n += coeff[j];
            }
        }
        out[i] = post_filter(s / n);
    }
    return out;
}
