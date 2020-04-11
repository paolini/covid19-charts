/*
 * database della protezione civile
 */

class DpcDataset extends BaseDataset {
    constructor(options) {
        super(options);
        this.fields = [
            "ricoverati_con_sintomi", 
            "terapia_intensiva", 
            "totale_ospedalizzati", 
            "isolamento_domiciliare", 
            "totale_positivi", 
            "nuovi_positivi", 
            "dimessi_guariti", 
            "deceduti", 
            "totale_casi", 
            "tamponi",

            // computed fields:
            "incremento deceduti",
            "incremento ricoverati_con_sintomi",
            "incremento terapia_intensiva",
            "incremento totale_ospedalizzati",
            "incremento isolamento_domiciliare",
            "incremento totale_positivi",
            "incremento dimessi_guariti",
            "incremento totale_casi",
            "incremento tamponi",
            
            "ricoverati_con_sintomi / totale_casi", 
            "terapia_intensiva / totale_casi", 
            "totale_ospedalizzati / totale_casi", 
            "isolamento_domiciliare / totale_casi", 
            "totale_positivi / totale_casi", 
            "nuovi_positivi / totale_casi",
            "dimessi_guariti / totale_casi", 
            "deceduti / totale_casi",

            "totale_casi / tamponi", 
            "tamponi / popolazione",

            "totale_casi / popolazione",
            "ricoverati_con_sintomi / popolazione", 
            "terapia_intensiva / popolazione", 
            "totale_ospedalizzati / popolazione", 
            "isolamento_domiciliare / popolazione", 
            "totale_positivi / popolazione", 
            "nuovi_positivi / popolazione",
            "dimessi_guariti / popolazione", 
            "deceduti / popolazione",
            
        ];
        this.filter_column = options.filter_column || null;
        this.filter_name_column = options.filter_name_column || this.filter_column;
        this.REPOSITORY_URL = "https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/";
    }

    init_html() {
        super.init_html();
        this.$column = $("select[name='" + this.prefix + "_column']");
        this.$select = this.filter_column ? $("select[name='" + this.prefix + "_" + this.filter_column + "]") : null;
    }    
    
    populate_html() {
        var self = this;
        if (this.filter_column) {
            var pairs = this.table.get_column_distinct_pairs(this.filter_column, this.filter_name_column);
            pairs.sort(function(a,b){return a[1].localeCompare(b[1])});
            this.$select.find('option').remove();
            pairs.forEach(function(pair) {
                if (pair[0] === "04" && self.filter_name_column === "denominazione_regione") {
                    pair[1] = "Trentino Alto Adige"; // fix upstream data
                }
                self.$select.append("<option value='" + pair[0] + "'>" + pair[1] + "</option>");
            });
        }

        this.$column.find('option').remove();
        this.fields.forEach(function(field){
            self.$column.append("<option value='" + field + "'>" + dash_to_space(field) + "</option>");
        });
    }

    get_options() {
        var options = super.get_options();
        options.column = this.$column.children("option:selected").val();
        if (this.filter_column) {
            options.value = this.$select.children("option:selected").val();
            options.value_name = this.$select.children("option:selected").text()
        }
        return options;
    }

    get_series(options) {
        var column = options['column'];
        const increment_prefix = 'incremento ';
        var series = this.get_series_extended(column, options);
        series.label = this.series_label(series.label, options['value_name']);
        return series;
    }

    get_series_extended(column, options) {
        var series;
        const increment_prefix = "incremento ";
        var columns = column.split('/').map(function(x){return x.trim();});
        if (columns.length === 2) {
            series = this.get_series_extended(columns[0], options);
            if (columns[1] === "popolazione") {
                series.data_y = series.data_y.map(function(x) {return 100.0 * x / series.population;});
                series.label += " / popolazione";
            } else {
                var s = this.get_series_extended(columns[1], options);
                series.data_y = series.data_y.map(function(x, i) {return 100.0 * x / s.data_y[i]});
                series.label += " / " + columns[1];
            }
            series.y_axis = 'rate';
        } else if (column.startsWith(increment_prefix)) {
            column = column.slice(increment_prefix.length);
            series = this.get_series_extended(column, options); 
            var new_data_y = new Array(series.data_y.length);
            var last = 0;
            for (var i=0; i < new_data_y.length; ++i) {
                new_data_y[i] = series.data_y[i] - last;
                last = series.data_y[i];
            }
            series.data_y = new_data_y;
            series.label = "incremento " + series.label;
        } else {
            series = this.get_series_basic(column, options);
        }
        return series;
    }

    get_series_basic(column, options) {
        var subtable = this.table;
        var value = null;
        var value_name = null;
        var population;
        
        if (this.filter_column) {
            value = options['value'];
            value_name = options['value_name'];
            subtable = subtable.filter(this.filter_column, value);
            population = popolazione_regioni[value_name];
        } else {
            population = country_population['Italy'];
        }
        
        var data_x = [];
        var data_y = [];

        var x_col = subtable.headers.indexOf("data");
        var y_col = subtable.headers.indexOf(column);
        subtable.rows.forEach(function(row) {
            var l = data_x.length;
            var x = string_to_date(row[x_col]);
            var y = string_to_int(row[y_col]);
            if (l>0 && data_x[l-1].getTime() === x.getTime()) {
                data_y[l-1] += y;
            } else {
                data_x.push(x);
                data_y.push(y);
            }
        });

        var y_axis = 'count';
        
        var label = column;
        var series = new Series(data_x, data_y, label);
        series.population = population;
        series.y_axis = y_axis;
        return series;
    }
}

class DpcNazionaleDataset extends DpcDataset {
    constructor() {
        super({
            name: "italia",
            path: "dati-andamento-nazionale/dpc-covid19-ita-andamento-nazionale.csv"
        });
    }

    series_label(column, value) {
        return "Italia " + dash_to_space(column);
    }
}

class DpcRegioniDataset extends DpcDataset {
    constructor() {
        super({
            name: "regioni",
            path: "dati-regioni/dpc-covid19-ita-regioni.csv",
            filter_name_column: "denominazione_regione",
            filter_column: "codice_regione"
        });
    }
}

class DpcProvinceDataset extends DpcDataset {
    constructor() {
        super({
            name: "province",
            path: "dati-province/dpc-covid19-ita-province.csv",
            filter_name_column: "denominazione_provincia",
            filter_column: "codice_provincia"
        });
        this.fields = ['totale_casi', 'incremento totale_casi'];
    }

    post_load_hook() {
        var k = this.table.headers.indexOf("denominazione_provincia");
        var h = this.table.headers.indexOf("denominazione_regione");
        this.table.rows.forEach(function(row){
            row[k] = row[h]+": "+row[k];
        });
    }
}
