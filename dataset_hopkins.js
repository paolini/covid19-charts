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

		for (var iloop=0; iloop<Object.keys(supranat_comp).length; iloop++){
        	this.table.rows.push(["", Object.keys(supranat_comp)[iloop]]);
        }
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
        var temp1 = options;
        var temp2 = temp1.splice(temp1.length-Object.keys(supranat_comp).length, temp1.length-1);
        //options.sort();
		temp1.sort();
		temp2.sort();
		
        temp2.forEach(function(option) {
            self.$select.append("<option value='" + option + "'>" + option + "</option>");
        });
        self.$select.append("<option>-----------</option>");
		temp1.forEach(function(option) {
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
        if (options['value'] in supranat_comp){
        	self = this;
        	series.data_y.fill(0);
        	series.population = 0;
        	supranat_comp[options['value']].forEach(function get_sum(item) {
        		var temp = options['value'];
        		options['value']=item;
        		for (var i=0; i<series.data_y.length; i++){  		
        			series.data_y[i] += self.get_series_basic(column, options).data_y[i];
        		}
        		options['value']=temp;
        	});
        }
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
                'recovered increment rate'
            ],
        });
    }
}
