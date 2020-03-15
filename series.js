class Series {
    constructor(data_x, data_y, label) {
        this.label = label;
        this.data_x = data_x;
        this.data_y = data_y;
        this.lr = linearRegression(this.data_y.map(Math.log), this.data_x.map(date_to_days));
        this.offset = this.lr.q/this.lr.m + days_today;
    }
}