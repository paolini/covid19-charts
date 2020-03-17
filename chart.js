var chart_config = {
    type: 'line',
    options: {
        title: {
            text: 'covid-19'
        },
        scales: {
            xAxes: [{
                type: 'time',
                time: {
                    tooltipFormat: 'll HH:mm'
                },
                scaleLabel: {
                    display: true,
                    labelString: 'Data'
                },
                ticks: {
                        major: {
                            enabled: true,
                            fontStyle: 'bold'
                        },
                        source: 'data',
                        autoSkip: true,
                        autoSkipPadding: 75,
                        maxRotation: 0,
                        sampleSize: 100
                    },
                    afterBuildTicks: function(scale, ticks) {
                        var majorUnit = scale._majorUnit;
                        if (! ticks) return;
                        var firstTick = ticks[0];
                        var i, ilen, val, tick, currMajor, lastMajor;

                        val = moment(ticks[0].value);
                        if ((majorUnit === 'minute' && val.second() === 0)
                                || (majorUnit === 'hour' && val.minute() === 0)
                                || (majorUnit === 'day' && val.hour() === 9)
                                || (majorUnit === 'month' && val.date() <= 3 && val.isoWeekday() === 1)
                                || (majorUnit === 'year' && val.month() === 0)) {
                            firstTick.major = true;
                        } else {
                            firstTick.major = false;
                        }
                        lastMajor = val.get(majorUnit);

                        for (i = 1, ilen = ticks.length; i < ilen; i++) {
                            tick = ticks[i];
                            val = moment(tick.value);
                            currMajor = val.get(majorUnit);
                            tick.major = currMajor !== lastMajor;
                            lastMajor = currMajor;
                        }
                        return ticks;
                    }
            }],
            yAxes: [{
                scaleLabel: {
                    display: true,
                    labelString: 'count'
                },
                ticks: {
                    beginAtZero: true,
                },
                type: 'linear',
                display: true,
                id: "count"
            },{
                scaleLabel: {
                    display: true,
                    labelString: '%'
                },
                ticks: {
                    beginAtZero: true,
                },
                type: 'linear',
                display: false,
                id: "rate"
            }
            ]
        },
        plugins: {
            colorschemes: { // https://nagix.github.io/chartjs-plugin-colorschemes/
              scheme: 'tableau.Tableau10' // ignored: see Chart.add_series below
            }
      
        }
    }
};

var months = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];



class ChartWrapper {
    constructor() {
        var self = this;
        var ctx = document.getElementById('canvas').getContext('2d');
        this.chart = new Chart(ctx, chart_config); 
        this.serieses = [];   
        this.days_today = date_to_days(new Date());
        this.time_shift = false;
        this.rate_plot = false;
        this.no_update = false;
        this.draw_fit = false;
        this.n_points = 0; // all

        this.$info = $("#chart_info");
        this.$clear = $("button[name='chart_clear']");
        this.$time_shift = $("input[name=time_shift]");
        this.$plot_type = $("select[name=chart_type]");
        this.$draw_fit = $("input[name=draw_fit");
        this.$n_points = $("select[name='n_points']");
    
        this.$clear.click(function(){ 
            self.clear(); 
        });

        this.$time_shift.change(function(){
            self.time_shift = self.$time_shift.is(":checked");
            if (self.serieses.length>1) self.redraw();
        })
        this.$time_shift.change();

        this.$plot_type.change(function() {
            var val = self.$plot_type.children("option:selected").val();
            self.chart.options.scales.yAxes[0].type = (val=="log") ? 'logarithmic' : 'linear';
            self.rate_plot = (val=="rate");
            self.redraw();
        })
        this.$plot_type.change();

        this.$draw_fit.change(function(){
            self.draw_fit = self.$draw_fit.is(":checked");
            self.redraw();
        })
        this.$draw_fit.change();

        this.$n_points.change(function() {
            var val = self.$n_points.children("option:selected").val();
            if (val === "") {
                self.n_points = 0;
            } else {
                self.n_points = parseInt(val);
            }
            self.redraw();
        });
        this.$n_points.change();
    }

    update() {
        if (!this.no_update) this.chart.update();
    }

    add_series(series) {
        function last(arr) {return arr[arr.length-1]}

        // we are going to modify data
        var data_x = series.data_x;
        var data_y = series.data_y;
        var label = series.label;

        // consider only last points
        if (this.n_points > 0) {
            data_x = data_x.slice(-this.n_points);
            data_y = data_y.slice(-this.n_points);
        }

        // compute linear regression
        var lr = linearRegression(data_y.map(Math.log), data_x.map(date_to_days))

        // time shift
        var offset = 0;
        if (this.time_shift && this.serieses.length>0) {
            var y0 = last(this.serieses[0].data_y);
            // y = exp(m x + q)
            var x = (Math.log(y0) - lr.q) / lr.m;
            offset = date_to_days(last(data_x)) - x;
            data_x = data_x.map(function(x){return days_to_date(date_to_days(x) + offset)});
            if (offset > 0) {
                label += " +" + offset.toFixed(1) + " days";
            } else if (offset < 0) {
                label += " -" + (-offset).toFixed(1) + " days";
            }
        }

        // convert to growing rate
        if (this.rate_plot) {
            var new_data_x = data_x.slice(1);
            var new_data_y = new Array(new_data_x.length);
            for (var i=0; i < new_data_y.length;++i) {
                if (data_y[i]>0) {
                    new_data_y[i] = (data_y[i+1] / data_y[i] - 1.0) * 100.0; 
                } else {
                    new_data_y[i] = 0.0;
                }
            }
            data_x = new_data_x;
            data_y = new_data_y;
        }

        this.chart.options.scales.yAxes[0].display = !this.rate_plot;
        this.chart.options.scales.yAxes[1].display = this.rate_plot;
        
        // draw curve
        var color = Chart.colorschemes.tableau.Tableau10[this.serieses.length % 10];
        var points = data_x.map(function(x, i) {return {"x": x, "y": data_y[i]}});
        this.chart.data.datasets.push({
            data: points,
            label: label,
            fill: false,
            yAxisID: (this.rate_plot ? "rate" : "count"),
            lineTension: 0,
            borderColor: color,
            pointBorderColor: color,
            borderJoinStyle: "round"
        });

        // draw fit curve
        if (this.draw_fit && data_x.length>1) {
            var start = date_to_days(data_x[0]) - offset;
            var end = date_to_days(last(data_x)) - offset + 5.0;
            var points = new Array(100);
            for (var i=0;i<points.length;++i) {
                var x = start + (end-start)*i/(points.length-1);
                points[i] = {
                    x: days_to_date(x + offset),
                    y: this.rate_plot ? 100.0*(Math.exp(lr.m)-1) : Math.exp(lr.m * x + lr.q)
                }
            }
            this.chart.data.datasets.push({
                data: points,
                fill: false,
                label: "fit",
                yAxisID: (this.rate_plot ? "rate" : "count"),
                pointRadius: 0,
                borderWidth: 1,
                pointHoverRadius: 0,
                borderColor: color
            })
        }

        // store the series for future redraw
        series.lr = lr; // forse non serve...
        this.serieses.push(series);

        this.update();
        this.display_regression(series);
    };

    display_regression(series) {
        var name = series.label;
        var lr = series.lr;
        var days_passed = lr.q/lr.m + this.days_today;
        var first_day = new Date((this.days_today-days_passed)*1000.0*60*60*24);
        this.$info.append(
            "<li> "+name+": " 
            + "exponential fit: R<sup>2</sup>=<b>"+lr.r2.toFixed(2)+"</b>, "
            + "average daily increase: <b>"+((Math.exp(lr.m)-1)*100).toFixed(1)+"%</b>, "
            + "doubling time: <b>"+ (Math.log(2.0)/lr.m).toFixed(1) +"</b> giorni, "
            + "origin <b>" + days_passed.toFixed(1) + "</b> days ago: "
            + "<b>" + first_day.getDate() + " " + months[first_day.getMonth()]+ " " + first_day.getFullYear() + "</b>"
            + "<!-- m="+lr.m+" "
            + "q="+lr.q+" --></li>"
            );
    }
    
    clear() {
        this.chart.data.datasets = [];
        this.serieses = [];
        this.update();
        this.$info.find("li").remove();
    }

    redraw() {
        var self = this;
        var serieses = this.serieses; // backup
        var no_update_backup = this.no_update;
        this.no_update = true;
        this.clear();
        serieses.forEach(function (series){
            self.add_series(series);
        })
        this.no_update = no_update_backup;
        this.update();
    }
};
