class DpcDataset {
    constructor(options) {
        this.options = options;
        const COMMON_FIELDS = ["ricoverati_con_sintomi", "terapia_intensiva", "totale_ospedalizzati", "isolamento_domiciliare", 
        "totale_attualmente_positivi", "nuovi_attualmente_positivi", "dimessi_guariti", "deceduti", "totale_casi", "tamponi"];
        this.prefix = this.options.prefix || this.options.name;
        this.fields = this.options.fields || COMMON_FIELDS;
        this.filter_column = this.options.filter_column || null;
        this.filter_name_column = this.options.filter_name_column || this.filter_column;
        this.label = this.options.label || 
            (function(column, value) {
                return value + " " + dash_to_space(column);
            });
    }

    load() {
        const REPOSITORY_URL = "https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/";

        console.log("start fetching dataset " + this.prefix);

        var self = this;
        return new Promise(function(resolve,reject) {
            fetch(REPOSITORY_URL + self.options.path)
            .then(function(response) {
                response.text().then(function(body) {
                    var rows = $.csv.toArrays(body);
                    var headers = rows[0];
                    var rows = rows.slice(1);
                    self.table = new Table(headers, rows);
                    if (self.options.table_adjust_hook) {
                        self.table = self.options.table_adjust_hook(self.table);
                    }
                    return resolve();
                });
            })
        });    
    }

    init_html() {
        this.$button = $("button[name='" + this.prefix + "_add']"); 
        this.$button.prop("disabled", true);
        this.$column = $("select[name='" + this.prefix + "_column']");
        this.$select = this.filter_column ? $("select[name='" + this.prefix + "_" + this.filter_column) : null;
    }

    populate_html() {
        var self = this;
        if (this.filter_column) {
            var pairs = this.table.get_column_distinct_pairs(this.filter_column, this.filter_name_column);
            pairs.sort(function(a,b){return a[1].localeCompare(b[1])});
            this.$select.find('option').remove();
            pairs.forEach(function(pair){
                self.$select.append("<option value='" + pair[0] + "'>" + pair[1] + "</option>");
            });
        }

        this.$column.find('option').remove();
        this.fields.forEach(function(field){
            self.$column.append("<option value='" + field + "'>" + dash_to_space(field) + "</option>");
        });

        this.$button.prop("disabled", false);

        this.$button.click(function(){self.click()});
    }

    click() {
        var column = this.$column.children("option:selected").val();
        var subtable = this.table;
        var value = null;
        var value_name = null;
        if (this.filter_column) {
            value = this.$select.children("option:selected").val();
            value_name = this.$select.children("option:selected").text();
            subtable = subtable.filter(this.filter_column, value);
        }

        var data_x = subtable.get_column("data").map(string_to_date);
        var data_y = subtable.get_column(column).map(string_to_int);

        var lr = linearRegression(data_y.map(Math.log), data_x.map(date_to_days));
        var my_offset = ((lr.q/lr.m) + days_today);

        var name = this.label(column, value_name);

        if (first_series_offset === null) {
            first_series_offset = my_offset;
        } else if ($("select[name=time_shift]").children("option:selected").val() === "on") {
            var offset =  my_offset - first_series_offset;
            data_x = data_x.map(function(x){return days_to_date(date_to_days(x) + offset)});
            if (offset > 0) {
                name += " +" + offset.toFixed(1) + " giorni";
            } else {
                name += " -" + (-offset).toFixed(1) + " giorni";
            }
        }

        chart_add_series(name, data_x, data_y);
        chart.render();

        display_regression(name, lr);
    }
    /*
        filters: object mapping column names to values
    */
    get_series(column, filters) {
        var rows = this.table.rows;

        Object.entries(filters).forEach(function(entry){
            var i = this.table.headers.indexOf(entry[0]);
            rows = rows.filter(function(row){row[i] === entry[1]});
        });

        var i = this.table.headers.indexOf("data");

        var data_x = this.get_column("data").map(string_to_date);
        var data_y = this.get_column(column).map(string_to_int);
        var label = this.options.label(column, filters);
        return new Series(data_x, data_y, label);
    }

}
