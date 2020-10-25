class HopkinsDataset extends BaseDataset {
    constructor(options) {
        super(options);
        this.REPOSITORY_URL = "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/";
        this.filter_column = options.filter_column || "Country/Region";
        this.subfilter_column = options.subfilter_column || "Province/State";
        this.fields = options.fields;
        this.first_time_column = 4;
        this.fields = options.fields;
    }

    init_html() {
        super.init_html();
        this.$select = $("select[name='" + this.prefix + "_filter']");
        this.$subselect = $("select[name='" + this.prefix + "_subfilter']");
        this.$column = $("select[name='" + this.prefix + "_column']");
    }
    
    populate_html() {
        var self = this;

        var obj = {};

        var i = this.table.headers.indexOf(this.filter_column);
        var j = this.table.headers.indexOf(this.subfilter_column);

        this.table.rows.forEach(function(row) {
            var value = row[i];
            var subvalue = row[j];
            if (!obj.hasOwnProperty(value)) obj[value] = {};
            if (subvalue !== "") {
                obj[value][subvalue] = true;
            }
        });

        this.$select.find("option").remove();
        var options = Object.getOwnPropertyNames(obj);
        options.sort();
        options.forEach(function(option) {
            self.$select.append("<option value='" + option + "'>" + option + "</option>");
        });

        this.$select.change(function() {
            var value = self.$select.children("option:selected").val();
            self.$subselect.find("option").remove();
            self.$subselect.append("<option value=''>-- all states --</option>");
            var options = Object.getOwnPropertyNames(obj[value]);
            options.sort();
            options.forEach(function(option) {
                self.$subselect.append("<option value='" + option + "'>" + option + "</option>");
            });
            self.$subselect.prop("disabled", false);
        });
        this.$select.change();

        this.$subselect.change(function() {
            var value = self.$subselect.children("option:selected").val();
            self.$column.prop('disabled', value !== "");
        });
        this.$subselect.change();

        this.$column.find("option").remove();
        this.fields.forEach(function(option) {
            self.$column.append("<option value='" + option + "'>" + option + "</option>");
        });
    }

    get_series(options) {
        var column = options['column'] || 'count';
        var series = this.get_series_extended(column, options);
        return series;
    }

    get_series_extended(column, options) {
        var series;
        const increment_postfix = " increment";
        var columns = column.split('/').map(function(x) {return x.trim();});
        if (columns.length === 2) {
            series = this.get_series_extended(columns[0], options);
            // columns[1] should be "population"
            if (series.population > 0) {
                series.data_y = series.data_y.map(function(x) {return  100.0 * x / series.population;});
                series.label += ' percent'; 
                series.y_axis = 'rate';
            }
        } else if (column.endsWith(increment_postfix)) {
            column = column.slice(0, -increment_postfix.length);
            series = this.get_series_extended(column, options);
            var new_data_y = new Array(series.data_y.length);
            var last = 0;
            for (var i=0; i < new_data_y.length; ++i) {
                new_data_y[i] = series.data_y[i] - last;
                last = series.data_y[i];
            }
            series.data_y = new_data_y;
            series.label += increment_postfix;
        } else {
            series = this.get_series_basic(column, options);
        }
        return series;
    }

    get_population(options) {
        if (options['subvalue'] === "") {
            return country_population[options['value']];
        }
        return 0; // population of region is unknown
    }

    get_series_basic(column, options) {
        var self = this;
        var value = options['value'];
        var subvalue = options['subvalue'];
        var subtable = this.table;
        var label = column + " " + value;
        
        subtable = subtable.filter(this.filter_column, value);
        if (subvalue !== "") {
            subtable = subtable.filter(this.subfilter_column, subvalue);
            label += " " + subvalue;
        }

        var data_x = this.table.headers.slice(this.first_time_column).map(anglo_to_date);
        var data_y = new Array(data_x.length)
        data_y.fill(0);

        subtable.rows.forEach(function(row){
            for (var i=0; i < data_y.length; i++) {
                data_y[i] += parseInt(row[i+self.first_time_column]);
            }
        });

        var series = new Series(data_x, data_y, label);
        series.y_axis = 'count';
        series.population = this.get_population(options);
        this.apply_filter(series, options);
        return series;
    }

    get_options() {
        var options = super.get_options();
        options.value = this.$select.children("option:selected").val();
        options.subvalue = this.$subselect.children("option:selected").val();
        options.column = this.$column.children("option:selected").val();
        return options;
    }
}

class HopkinsConfirmedDataset extends HopkinsDataset {
    constructor() {
        super({
            name: "confirmed",
            path: "csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv",
            fields: ['confirmed', 'confirmed / population', 'confirmed increment'],
        });
    }
}

class HopkinsDeathsDataset extends HopkinsDataset {
    constructor() {
        super({
            name: "deaths",
            path: "csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv",
            fields: ['deaths', 'deaths / population', 'deaths increment'],
        });
    }
}

class HopkinsRecoveredDataset extends HopkinsDataset {
    constructor() {
        super({
            name: "recovered",
            // path: "csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Recovered.csv",
            path: "csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_recovered_global.csv",
            fields: ['recovered', 'recovered / population', 'recovered increment'],
        });
    }
}
