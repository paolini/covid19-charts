/*
 EPIDEMIC CALCULATOR
*/
class EpcalcDataset {
    constructor(options) {
        this.prefix = 'epcalc';
        this.last_options = {};
        this.require_setup = true;
        this.params = [
            {
                field: 'N',
                label: 'population',  
                type: "int",
                value: 60e6
            }, {
                field: 'I0',
                lable: 'infected at start date',
                type: "int",
                value: 1
            }, {
                field: 'date0', 
                label: "start date",
                type: "date",
                value: "2020-02-01"
            }, {
                field: 'R0',  
                label: 'R0 (R at start date)',
                type: "float",
                value: 2.2
            }, {
                field: 'date1', 
                label: "date 1",
                type: "date",
                value: "2020-03-01"
            }, {
                field: 'R1', 
                label: 'R1 (R at date 1)', 
                type: "float",
                value: 0.73 
            }, {
                field: 'date2', 
                label: "date 2",
                type: "date",
                value: "2020-04-01"
            }, {
                field: 'R2',  
                label: "R2 (R at date 2)",
                type: "float",
                value: 1.1 
            },{ 
                field: 'date3', 
                label: "end date",
                type: "date",
                value: "2020-05-01"
            }, {
                field: 'D_incubation',  
                label: "incubation days",
                type: "float",
                value: 5.2 
            }, {
                field: 'D_infectious',  
                label: "n. days patient is infective",
                type: "float",
                value: 2.9 
            }, {
                field: 'CFR', 
                label: "case fatality rate", 
                type: "float",
                value: 0.02 
            }, {
                field: 'Time_to_death', 
                label: "days from end of incubation to death",
                type: "int",
                value: 32 
            }, {
                field: 'D_recovery_severe',  
                label: "days of hospital stay for severe cases",
                type: "float",
                value: (31.5 - 2.9) 
            }, {   
                field: 'D_recovery_mild',  
                label: 'recovery days for mild cases',
                type: "float",
                value: (14 - 2.9) 
            }, {
                field: 'P_SEVERE',  
                label: 'hospitalization rate',
                type: "float",
                value: 0.2 
            },  {
                field: 'D_hospital_lag',  
                label: "days before hospitalization",
                type: "float",
                value: 5 
            }
        ];
    }
  
    setup() {
        var self = this;
        this.require_setup = false;
        var $parent = $("#epcalc_params");
        $parent.empty();
        var first = true;
        this.params.forEach(function(opt) {
                var field = opt.field;
                if (!first) {
                    $parent.append(" --- ");          
                }
                $parent.append((opt.label || field) + ':&nbsp;<input name="epcalc_' + field + '" value="' + opt.value + '">');      
                first = false;
            });
        this.$column=$("select[name='epcalc_column']");
    }

    add_series(options) {
        var changed = false;
        var self = this;
        var params = {} // integrator parameters to be constructed from options
        Object.entries(options).forEach(function(pair) {
            var key = pair[0];
            var value = pair[1];
            if (key !== 'column' && !(self.last_options[key] && self.last_options[key]==value)) {
                changed = true;
            } 
            params[key] = value;
        });
        self.last_options = options; // for caching

        params.dt = 1;

        var origin_days = date_to_days(string_to_date(options.date0));
        params.day_1 = date_to_days(string_to_date(options.date1)) - origin_days;
        params.day_2 = date_to_days(string_to_date(options.date2)) - origin_days;
        params.day_end = date_to_days(string_to_date(options.date3)) - origin_days;
        
        if (changed) {
          this.sol = get_solution(params);
        }
  
        var N = params.N;
  
        var f = {
          'S': function(x){return N*x[0]},
          'E': function(x){return N*x[1]},
          'I': function(x){return N*(x[2] + x[3] + x[4] + x[5] + x[6])},
          'R': function(x){return N*(x[7]+x[8]+x[9])},
          'hospital': function(x){return N*(x[5] + x[6])},
          'recovered': function(x){return N*(x[7] + x[8])},
          'deceased': function(x){return N*x[9]}
        }[options.column];
  
        var data_y = this.sol.map(f);
        var data_x = new Array(data_y.length);
        for(var i=0;i<data_x.length;++i) {
            data_x[i] = days_to_date(origin_days + i * params.dt);
        }
        var series = new Series(data_x, data_y, 'epcalc ' + options.column);
        series.y_axis = 'count';
        series.population = N;
  
        chart.add_series(series);
        replay.push({
            dataset: this.prefix,
            options: options
        })
    }  
      
    click() {
      var options = {};
      this.params.forEach(function(field_opt) {
        var field = field_opt.field;
        var parser = {
          "int": parseInt,
          "float": parseFloat,
          "date": function(x) {return x}
        }[field_opt.type];
        var val = parser($("input[name='epcalc_" + field + "']").val());
        options[field] = val;
      });
      options.column = this.$column.val();

      this.add_series(options);
    }
  }