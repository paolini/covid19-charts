class HopkinsDataset extends BaseDataset {
    constructor(options) {
        super(options);
        this.REPOSITORY_URL = "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/";
        this.filter_column = options.filter_column || "Country/Region";
        this.subfilter_column = options.subfilter_column || "Province/State";
        this.fields = options.fields;
        this.first_time_column = 4;
        this.fields = options.fields;
        this.supranat_comp = {
            "ASEAN" : ["Brunei", "Cambodia", "Indonesia", "Laos", "Malaysia", "Myanmar", "Philippines", "Singapore", "Thailand", "Vietnam"],
            "CIS": ["Armenia", "Azerbaijan", "Belarus", "Kazakhstan", "Kyrgyzstan", "Moldova", "Russia", "Tajikistan", "Uzbekistan"],
            "EU" : ["Belgium", "Bulgaria", "Czechia", "Denmark", "Germany" , "Estonia", "Ireland", "Greece", "Spain", "France", "Croatia", 
                    "Italy", "Cyprus", "Latvia", "Lithuania", "Luxembourg", "Hungary", "Malta", "Netherlands", "Austria", "Poland", 
                    "Portugal", "Romania", "Slovenia", "Slovakia", "Finland", "Sweden"]
        };
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
        this.$select.find("option").remove();
        for(var option in this.supranat_comp) {
            self.$select.append("<option value='" + option + "'>" + option + "</option>");
            obj[option] = {};
        }
        self.$select.append("<option value=''>-----------</option>");

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


        var options = Object.getOwnPropertyNames(obj);
        options.sort();
        
        
        options.forEach(function(option) {
            self.$select.append("<option value='" + option + "'>" + option + "</option>");
        });
		
        this.$select.change(function() {
            var value = self.$select.children("option:selected").val();
            if (value==="") return;
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

    get_population(options) {
        if (options['subvalue'] !== "") {
            return 0; // population of region is unknown
        }
        var value = options['value'];
        if (value in this.supranat_comp) {
            var population = 0;
            this.supranat_comp[options['value']].forEach(function(country){
                var p = country_population[country];
                if (!p) {console.log(country + " has no population data");}
                population += country_population[country];
            });
            return population;
        }
        return country_population[value];
    }

    get_series_basic(column, options) {
        var self = this;
        var value = options['value'];
        var subvalue = options['subvalue'];
        var subtable = this.table;
        var label = column + " " + value;
        
        if (value in this.supranat_comp) {
            var k = subtable.headers.indexOf(this.filter_column); // column with country name
            var lst = this.supranat_comp[value];
            subtable = new Table(
                subtable.headers, 
                subtable.rows.filter(function(row) {
                    return lst.indexOf(row[k]) >= 0;
                }));
        } else {
            subtable = subtable.filter(this.filter_column, value);
            if (subvalue !== "") {
                subtable = subtable.filter(this.subfilter_column, subvalue);
                label += " " + subvalue;
            }
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
        series.population = this.get_population(options);
        series.y_axis = 'count';
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
            fields: [
                'confirmed', 
                'confirmed / population', 
                'confirmed increment',
                'confirmed increment / population',
                'confirmed increment rate'
            ],
        });
    }
}

class HopkinsDeathsDataset extends HopkinsDataset {
    constructor() {
        super({
            name: "deaths",
            path: "csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv",
            fields: [
                'deaths', 
                'deaths / population', 
                'deaths increment',
                'deaths increment / population',
                'deaths increment rate'    
            ],
        });
    }
}

class HopkinsRecoveredDataset extends HopkinsDataset {
    constructor() {
        super({
            name: "recovered",
            // path: "csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-Recovered.csv",
            path: "csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_recovered_global.csv",
            fields: [
                'recovered', 
                'recovered / population', 
                'recovered increment',
                'recovered increment / population',
                'recovered increment rate'
            ],
        });
    }
}
