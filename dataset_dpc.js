/*
 * database della protezione civile
 */

class DpcDataset extends BaseDataset {
    constructor(options) {
        super(options);
        this.fields = [
            "ricoverati_con_sintomi",
            "terapia_intensiva",
            "ingressi_terapia_intensiva",
            "totale_ospedalizzati",
            "isolamento_domiciliare",
            "totale_positivi_test_molecolare",
            "totale_positivi_test_antigenico_rapido",
            "totale_positivi",
            "nuovi_positivi",
            "dimessi_guariti",
            "deceduti",
            "totale_casi",
            "tamponi_test_molecolare",
            "tamponi_test_antigenico_rapido",
            "tamponi",
            "casi_testati",
            "casi_da_sospetto_diagnostico",
            "casi_da_screening"
        ];
        this.filter_column = options.filter_column || null;
        this.filter_name_column = options.filter_name_column || this.filter_column;
        this.REPOSITORY_URL = "https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/";
        this.language = 'italian';
        this.translate = {
            'population': 'popolazione',
            'increment': 'incremento',
            'rate': 'tasso'
        };
    }

    init_html() {
        super.init_html();
        this.$column = $("select[name='" + this.prefix + "_column']");
        this.$select = this.filter_column ? $("select[name='" + this.prefix + "_" + this.filter_column + "']") : null;
        this.$modifier = $("select[name='dpc_modifier']");
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
        var modifier = this.$modifier.val();
        if (this.$modifier.is(':visible') && modifier && modifier.indexOf('*')>=0) {
            options.column = modifier.replace('*', options.column);
        }
        return options;
    }

    get_series_basic(column, options) {
        var subtable = this.table;
        var value = null;
        var value_name = null;

        if (this.filter_column) {
            value = options['value'];
            value_name = options['value_name'];
            subtable = subtable.filter(this.filter_column, value);
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
        series.population = this.get_population(options);
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

    get_population(options) {
        return country_population['Italy'];
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

    get_population(options) {
        return popolazione_regioni[options['value_name']];
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
        this.fields = [
            'totale_casi', 
            'incremento totale_casi',
            'tasso incremento totale_casi',
            'totale_casi / popolazione',
            'incremento totale_casi / popolazione'
        ];
    }

    get_population(options) {
        var provincia = options['value_name'].split(": ")[1];
        return popolazione_province[provincia];
    }

    post_load_hook() {
        var k = this.table.headers.indexOf("denominazione_provincia");
        var h = this.table.headers.indexOf("denominazione_regione");
        this.table.rows.forEach(function(row){
            row[k] = row[h]+": "+row[k];
        });
    }
}
