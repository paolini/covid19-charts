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

    get_population(options) {
        return null;
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
            options.filter = this.$filter.val();
            options.period = document.getElementById("period").value;
        }
        return options;
    }

    apply_filter(series, options) {
        if (options.filter) {
            var label = options.filter;
            var s = options.filter.split(" ");
            var size = options.period;
            var f = null;
            if (s[0] == "binomial") {
                series.data_y = filter(series.data_y, binomial_coeff(size), 1);
                series.label += " (" + label + " " + size + ")";
            } else if (s[0] == "flat") {
                series.data_y = filter(series.data_y, flat_coeff(size), 0);
                series.label += " (" + label + " " + size + ")";
            } else if (s[0] == "flat_centered") {
                series.data_y = filter(series.data_y, flat_coeff(size), 1);
                series.label += " (" + label + " " + size + ")";
            }
        }
    }

    add_series(options) {
        var series = this.get_series(options);
        // this.apply_filter(series, options);
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
