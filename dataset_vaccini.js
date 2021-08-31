/*
 * database opendata-vaccini
 */

class VacciniDataset extends BaseDataset {
    constructor(options) {
        super(options);
        this.filter_column = "codice_regione_ISTAT";
        this.filter_name_column = "nome_area";
        this.REPOSITORY_URL = "https://raw.githubusercontent.com/italia/covid19-opendata-vaccini/master/";
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
        this.$modifier = $("select[name='vaccini_modifier']");
    }

    populate_html() {
        var self = this;
        if (this.filter_column) {
            var pairs = this.table.get_column_distinct_pairs(this.filter_column, this.filter_name_column);
            pairs.sort(function(a,b){return a[1].localeCompare(b[1])});
            this.$select.find('option').remove();
            this.$select.append("<option value=''>-- tutte le regioni --</option>");
            pairs.forEach(function(pair) {
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
        if (this.$modifier) {
            var modifier = this.$modifier.val();
            if (this.$modifier.is(':visible') && modifier && modifier.indexOf('*')>=0) {
                options.column = modifier.replace('*', options.column);
            }
        }
        return options;
    }

    get_population(options) {
        if (options['value']=='') return country_population['Italy'];
        return popolazione_regioni[options['value_name']];
    }

    get_series_basic(column, options) {
        var subtable = this.table;
        var label = dash_to_space(column);

        if (this.filter_column) {
            var value = options['value'];
            if (value) {
                subtable = subtable.filter(this.filter_column, value);
                label += " " + options['value_name'];
            }
        }

        var data_x = [];
        var data_y = [];

        var x_col = subtable.headers.indexOf("data_somministrazione");
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

        var series = new Series(data_x, data_y, label);
        series.population = this.get_population(options);
        series.y_axis = y_axis;
        series.cumulative = false;
        if (column == 'totale') series.cumulative = true;
        return series;
    }
}

class VacciniSomministrazioneDataset extends VacciniDataset {
    constructor() {
        super({
            name: "somministrazione",
            path: "dati/somministrazioni-vaccini-latest.csv"
        });
        this.fields = [
            "sesso_maschile", 
            "sesso_femminile", 
            "prima_dose", 
            "seconda_dose",
            "pregressa_infezione"
        ];
    }
}

class VacciniSomministrazioneSummaryDataset extends VacciniDataset {
    constructor() {
        super({
            name: "somministrazione",
            path: "dati/somministrazioni-vaccini-summary-latest.csv",
            table_sort_column: "data_somministrazione"
        });
        this.fields = [
            "sesso_maschile", 
            "sesso_femminile", 
            "prima_dose", 
            "seconda_dose",
            "pregressa_infezione"
        ];
    }
}



