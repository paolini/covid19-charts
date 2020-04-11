class BaseDataset {
    constructor(options) {
        this.prefix = options.prefix || options.name;
        this.path = options.path;
        this.can_be_filtered = true;
    }

    setup() {
        var self = this;
        this.init_html();
        
        return this.load().then(function() {
            self.populate_html();            
        });
    }

    post_load_hook() {}

    series_label(column, value) {
        return value + " " + dash_to_space(column);
    }

    load() {
        var self = this;
        console.log("start fetching dataset " + self.prefix);

        return new Promise(function(resolve,reject) {
            fetch(self.REPOSITORY_URL + self.path)
            .then(function(response) {
                response.text().then(function(body) {
                    var rows = $.csv.toArrays(body);
                    var headers = rows[0];
                    rows = rows.filter(function(row){return row.length>= headers.length});
                    rows = rows.slice(1);
                    self.table = new Table(headers, rows);
                    
                    self.post_load_hook();

                    console.log("finished fetching dataset " + self.prefix);
                    return resolve();
                });
            })
        });    
    }

    init_html() {
        if (this.can_be_filtered) {
            this.$filter = $("select[name='filter']");
        }
    }

    get_options() {
        var options = {};
        if (this.can_be_filtered) {
            options.filter = parseInt(this.$filter.val());
        }
        return options;
    }

    add_series(options) {
        var series = this.get_series(options);
        if (options.filter) {
            series.data_y = filter(series.data_y, binomial_coeff(options.filter));
            series.label += " (smooth " + options.filter +")";
        }
        chart.add_series(series);
        replay.push({
            dataset: this.prefix,
            options: options
        })
    }

    click() {
        var options = this.get_options();
        this.add_series(options);
    }
}
