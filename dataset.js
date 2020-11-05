class BaseDataset {
    constructor(options) {
        this.prefix = options.prefix || options.name;
        this.path = options.path;
        this.can_be_filtered = true;
        this.language = 'english';
        this.translate = {
            'population': 'population',
            'increment': 'increment',
            'rate': 'rate'
        }
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
        if (value) {
            return value + " " + dash_to_space(column);
        } else {
            return column;
        }
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
            options.filter = this.$filter.val() + ' ' + $("input[name='period']").val();
        }
        return options;
    }

    apply_filter(series, options) {
        if (series.has_been_filtered) return;
        if (options.filter) {
            // typical value: options.filter === "flat_centered 7"
            var name = options.filter.split(' ')[0];
            var size = parseInt(options.filter.split(' ')[1]);
            var label = options.filter.replace('_', ' ');
            if (name == "binomial") {
                series.data_y = filter(series.data_y, binomial_coeff(size), 1);
            } else if (name == "flat") {
                series.data_y = filter(series.data_y, flat_coeff(size), 0);
            } else if (name == "flat_centered") {
                series.data_y = filter(series.data_y, flat_coeff(size), 1);
            } else if (name == "log_flat") {
                series.data_y = filter(series.data_y, flat_coeff(size), 0, 1);
            } else if (name == "log_flat_centered") {
                series.data_y = filter(series.data_y, flat_coeff(size), 1, 1);
            } else {
                label = null;
            }
            if (label !== null) {
                series.label += " (" + label + ")";
            }
            series.has_been_filtered = true;
        }
    }

    get_series_extended(column, options) {
        var columns = column.split('/').map(function(x){return x.trim();});
        if (columns.length === 2) {
            var series = this.get_series_extended(columns[0], options);
            if (columns[1] === this.translate['population']) {
                series.data_y = series.data_y.map(function(x) {return 100.0 * x / series.population;});
                series.label += " / " + this.translate['population'];
            } else {
                var s = this.get_series_extended(columns[1], options);
                this.apply_filter(series, options);
                this.apply_filter(s, options);
                series.data_y = series.data_y.map(function(x, i) {return 100.0 * x / s.data_y[i]});
                series.label += " / " + s.label;
            }
            series.y_axis = 'rate';
            return series;
        }
        var increment_column = null;
        var rate_column = null;
        var word = this.translate['increment'];
        if (column.startsWith(word + ' ')) {
            increment_column = column.slice(word.length +  1);
        } else if (column.endsWith(' ' + word)) {
            increment_column = column.slice(0, -word.length-1);
        } else {
            word = this.translate['rate'];
            if (column.startsWith(word + ' ')) {
                rate_column = column.slice(word.length +  1);
            } else if (column.endsWith(' ' + word)) {
                rate_column = column.slice(0, -word.length-1);
            }
        }
        if (increment_column || rate_column) {
            var series = this.get_series_extended(increment_column || rate_column, options);
            if (rate_column) {
                this.apply_filter(series, options);
            }
            var new_data_y = new Array(series.data_y.length);
            var last = 0;
            for (var i=0; i < new_data_y.length; ++i) {
                new_data_y[i] = series.data_y[i] - last;
                if (rate_column) {
                    new_data_y[i] *= 100.0 / last;
                }
                last = series.data_y[i];
            }
            series.data_y = new_data_y;
            if (this.language == 'italian') {
                series.label = word + ' ' + series.label;
            } else {
                series.label += ' ' + word;
            }
            if (rate_column) {
                series.y_axis = 'rate';
            }
            return series;
        } 
        var series = this.get_series_basic(column, options);
        return series;
    }

    get_series(options) {
        var column = options['column'] || 'count';
        var series = this.get_series_extended(column, options);
        this.apply_filter(series, options);
        series.label = this.series_label(series.label, options['value_name']);
        return series;
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
