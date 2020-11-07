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
            "ASEAN" : ["Brunei", "Cambodia", "Indonesia", "Laos", "Malaysia", "Burma", "Philippines", "Singapore", "Thailand", "Vietnam"],
            "AU" : ["Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi", "Cameroon", "Cabo Verde", "Central African Republic", "Chad", "Comoros", "Congo (Kinshasa)", "Congo (Brazzaville)", "Djibouti", "Egypt", "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia", "Gabon", "Gambia", "Ghana", "Guinea", "Guinea-Bissau", "Cote d'Ivoire", "Kenya", "Lesotho", "Liberia", "Libya", "Madagascar", "Malawi", "Mali", "Mauritania", "Mauritius", "Morocco", "Mozambique", "Namibia", "Niger", "Nigeria", "Rwanda", "Western Sahara", "Sao Tome and Principe", "Senegal", "Seychelles", "Sierra Leone", "Somalia", "South Africa", "South Sudan", "Sudan", "Tanzania", "Togo", "Tunisia", "Uganda", "Zambia", "Zimbabwe"],
            "CARICOM" : ["Antigua and Barbuda", "Bahamas", "Barbados", "Belize", "Dominica", "Grenada", "Guyana", "Haiti", "Jamaica", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Suriname", "Trinidad and Tobago"],
"CIS": ["Armenia", "Azerbaijan", "Belarus", "Kazakhstan", "Kyrgyzstan", "Moldova", "Russia", "Tajikistan", "Uzbekistan"],
            "ECO" : ["Afghanistan", "Azerbaijan", "Iran", "Kazakhstan", "Kyrgyzstan", "Pakistan", "Tajikistan", "Turkey", "Turkmenistan", "Uzbekistan"],
            "EU" : ["Belgium", "Bulgaria", "Czechia", "Denmark", "Germany" , "Estonia", "Ireland", "Greece", "Spain", "France", "Croatia", 
                    "Italy", "Cyprus", "Latvia", "Lithuania", "Luxembourg", "Hungary", "Malta", "Netherlands", "Austria", "Poland", 
                    "Portugal", "Romania", "Slovenia", "Slovakia", "Finland", "Sweden"],
            "GCC" : ["Bahrain", "Kuwait", "Oman", "Qatar", "Saudi Arabia", "United Arab Emirates"],
            "Pacific Alliance" : ["Chile", "Colombia", "Mexico", "Peru"],
            "PIF" : ["Australia", "Fiji", "Kiribati", "Marshall Islands", "Micronesia", "Nauru", "New Zealand", "Palau", "Papua New Guinea", "Samoa", "Solomon Islands", "Tonga", "Tuvalu", "Vanuatu"],
            "Turkic Council" : ["Azerbaijan", "Kazakhstan", "Kyrgyzstan", "Turkey", "Uzbekistan"]
        };
        this.country_dict = null;
    }

    init_html() {
        super.init_html();
        this.$supranat = $("select[name='" + this.prefix + "_supranat']");
        this.$select = $("select[name='" + this.prefix + "_filter']");
        this.$subselect = $("select[name='" + this.prefix + "_subfilter']");
        this.$column = $("select[name='" + this.prefix + "_column']");
    }
    
    populate_html() {
        var self = this;

        if (self.country_dict === null) { // execute once
            self.country_dict = {};
            var i = this.table.headers.indexOf(this.filter_column);
            var j = this.table.headers.indexOf(this.subfilter_column);
            
            this.table.rows.forEach(function(row) {
                var value = row[i];
                var subvalue = row[j];
                if (!self.country_dict.hasOwnProperty(value)) self.country_dict[value] = {};
                if (subvalue !== "") {
                    self.country_dict[value][subvalue] = true;
                }
            });
        }

        self.$supranat.find("option").remove();
        self.$supranat.append("<option value=''>world</option>");
        for(var option in this.supranat_comp) {
            self.$supranat.append("<option value='" + option + "'>" + option + "</option>");
        }

        function populate_select(options) {
            self.$select.find("option").remove();
            self.$select.append("<option value=''>-- all states --</option>");
            options.sort();
            options.forEach(function(option) {
                self.$select.append("<option value='" + option + "'>" + option + "</option>");
            });        
        }

        self.$supranat.change(function() {
            var value = self.$supranat.val();
            if (value === "") { // world
                populate_select(Object.getOwnPropertyNames(self.country_dict));
            } else {
                populate_select(self.supranat_comp[value]);
            }
        });
        self.$supranat.change();
                
        self.$select.change(function() {
            var value = self.$select.children("option:selected").val();
            self.$subselect.find("option").remove();
            self.$subselect.append("<option value=''>-- all regions --</option>");
            var options = [];
            if (value) {
                options = Object.getOwnPropertyNames(self.country_dict[value]);
                options.sort();
                options.forEach(function(option) {
                    self.$subselect.append("<option value='" + option + "'>" + option + "</option>");
                });
            }
            self.$subselect.toggle(options.length>0);
        });
        this.$select.change();

        this.$subselect.change(function() {
            var value = self.$subselect.children("option:selected").val();
            self.$column.prop("disabled", false);
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
        if (value === '') {
            return 7800000000; // world population
        } else if (value in this.supranat_comp) {
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
        
        if (value === '') { // world population
            // no filtering!
            label += "world";
        } else if (value in this.supranat_comp) {
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
        if (options.value === '') {
            options.value = this.$supranat.val();
        }
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
