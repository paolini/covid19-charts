/*
 EPIDEMIC CALCULATOR
*/
class EpcalcDataset {
    constructor(options) {
        this.prefix = 'epcalc';
        this.last_params = {};
        this.require_setup = true;
        this.options = {};
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
                value: "2020-01-01"
            }, {
                field: 'R0',  
                label: 'R0 (R at start date)',
                type: "float",
                value: 2.2
            }, {
                field: 'date1', 
                label: "date 1",
                type: "date",
                value: "2020-04-09"
            }, {
                field: 'R1', 
                label: 'R1 (R at date 1)', 
                type: "float",
                value: 0.73 
            }, {
                field: 'date2', 
                label: "date 2",
                type: "date",
                value: "2020-06-01"
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
  
    setup(input) {
        var self = this;
        this.require_setup = false;
        var $parent = $("#epcalc_params");
        $parent.empty();
        var first = true;
        this.options = {};
        this.current_input = {}; // to be used for hash string reconstruction
        this.params.forEach(function(opt) {
                var field = opt.field;
                var parser = {
                    "int": parseInt,
                    "float": parseFloat,
                    "date": function(x) {return x}
                  }[opt.type];
                if (!first) {
                    $parent.append(" --- ");          
                }
                var value = opt.value;
                if (input && input.hasOwnProperty(field)) {
                    value = input[field];
                }
                $parent.append((opt.label || field) + ':&nbsp;<input name="epcalc_' + field + '" value="' + value + '">');      
                $("input[name='epcalc_" + field + "']").change(function() {
                    var value = $(this).val();
                    self.options[field] = parser(value);
                    self.current_input[field] = value;
                    self.update();
                });
                self.options[field] = parser(value);
                self.current_input[field] = value;
                first = false;
            });
        this.$column = $("select[name='epcalc_column']");
        this.$auto_update = $("input[name='epcalc_auto_update']");
        this.update_solution(this.options);
    }

    update() {
        var self = this;
        this.update_solution(this.options);
        var changed = false;
        chart.serieses.forEach(function(series) {
            if (series.epcalc_auto_update) {
                var column = series.epcalc_column;
                var s = self.get_series(column);
                series.data_x = s.data_x;
                series.data_y = s.data_y;
                changed = true;
            }
        });
        if (changed) chart.redraw();
    }

    update_solution(options) {
        var origin_days = date_to_days(string_to_date(options.date0));
        var self = this;
        var params = {} // integrator parameters to be constructed from options
        var changed = false;
        epcalc_params.forEach(function(key) {
            var val;
            if (key === "day_1") {
                val = date_to_days(string_to_date(options.date1)) - origin_days + 1;
            } else if (key === "day_2") {
                val = date_to_days(string_to_date(options.date2)) - origin_days + 1;
            } else if (key === "day_end") {
                val = date_to_days(string_to_date(options.date3)) - origin_days + 1;
            } else if (key === "dt") {
                val = 1;            
            } else {
                val = options[key];
            }
            params[key] = val;
            if (!(self.last_params[key] && self.last_params[key]===val)) {
                changed = true;
            }
        });

        if (changed) {
            this.sol = get_solution(params);
            this.last_params = params;
        }
        this.last_params.origin_days = origin_days;
    }

    get_series(column) {
        var N = this.last_params.N;
        var origin_days = this.last_params.origin_days;
        var dt = this.last_params.dt;

        var f = {
            'S': function(x){return N*x[0]},
            'E': function(x){return N*x[1]},
            'I': function(x){return N*(x[2] + x[3] + x[4] + x[5] + x[6])},
            'R': function(x){return N*(x[7]+x[8]+x[9])},
            'hospital': function(x){return N*(x[5] + x[6])},
            'recovered': function(x){return N*(x[7] + x[8])},
            'deceased': function(x){return N*x[9]}
          }[column];
    
        var data_y = this.sol.map(f);
        var data_x = new Array(data_y.length);
        for(var i=0;i<data_x.length;++i) {
            data_x[i] = days_to_date(origin_days + i * dt);
        }
        var series = new Series(data_x, data_y, 'epcalc ' + column);
        series.y_axis = 'count';
        series.population = N;
        series.epcalc_column = column;

        return series;
    }

    add_series(options) {
        if (options.auto_update) {
            options = Object.assign({
                auto_update: true,
                column: options.column
            }, this.options);
        }
        this.update_solution(options);
        var series = this.get_series(options.column);
        series.epcalc_auto_update = options.auto_update;
        chart.add_series(series);

        if (options.auto_update) {
            // to be stored in the url hash
            options = {
                auto_update: true,
                column: options.column
            };
        } else {
            options = Object.assign({}, options); // duplicate before storing
        }

        replay.push({
            dataset: this.prefix,
            options: options
        });
    }  
      
    click() {
        this.options.auto_update = this.$auto_update.prop('checked');
        this.options.column = this.$column.val();
        this.add_series(this.options);
    }
  }